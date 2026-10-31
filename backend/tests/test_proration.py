from datetime import date, timedelta
import pytest
from backend.app.models.invoice import Invoice
from backend.tests.test_crud import auth_tokens


def test_proration_upgrade_plan(client, auth_tokens, db_session):
    """
    Test POST /api/subscriptions/{id}/change-plan:
    - Calculates unused amount of current period
    - Calculates prorated cost of new plan
    - Generates adjusted invoice with net difference
    - Updates subscription plan and logs activity
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # 1. Setup Customer, Products, and Plans
    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Proration User", "email": "proration@test.com"},
    ).json()

    basic_plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Basic Plan", "price": 300.0, "billing_period": "monthly"},
    ).json()

    pro_plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Pro Plan", "price": 600.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Service Plan", "sales_price": 300.0},
    ).json()

    # 2. Create subscription on Basic Plan
    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": basic_plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # 3. Create invoice for current period
    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers).json()
    assert inv["total"] == 300.0

    # 4. Simulate subscription halfway through the 30-day period:
    # Set period_start 15 days ago, period_end 15 days in future (total 31 days, ~16 days remaining)
    inv_model = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()
    inv_model.period_start = date.today() - timedelta(days=15)
    inv_model.period_end = date.today() + timedelta(days=15)
    db_session.commit()

    # 5. Change plan to Pro Plan ($600/month)
    change_res = client.post(
        f"/api/subscriptions/{sub['id']}/change-plan",
        headers=headers,
        json={"new_plan_id": pro_plan["id"]},
    )
    assert change_res.status_code == 200, change_res.text
    data = change_res.json()

    assert data["subscription_id"] == sub["id"]
    assert data["old_plan_id"] == basic_plan["id"]
    assert data["new_plan_id"] == pro_plan["id"]
    assert data["unused_credit"] > 0
    assert data["new_plan_prorated"] > data["unused_credit"]
    assert data["net_adjusted_amount"] > 0
    assert data["invoice_id"] is not None
    assert data["invoice_total"] == data["net_adjusted_amount"]

    # 6. Verify subscription plan was updated
    updated_sub = client.get(f"/api/subscriptions/{sub['id']}", headers=headers).json()
    assert updated_sub["plan_id"] == pro_plan["id"]
    assert updated_sub["plan"]["name"] == "Pro Plan"

    # 7. Verify timeline logs plan change
    timeline = client.get(f"/api/subscriptions/{sub['id']}/timeline", headers=headers).json()
    actions = [l["action"] for l in timeline]
    assert "plan_changed" in actions


def test_proration_validation_rules(client, auth_tokens):
    """
    Test validation guards for plan change:
    - Same plan rejected (400)
    - Closed subscription rejected (400)
    - Non-existent plan rejected (404)
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Guard User", "email": "guard@test.com"},
    ).json()

    plan_a = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Plan Alpha", "price": 100.0, "billing_period": "monthly"},
    ).json()

    plan_b = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Plan Beta", "price": 200.0, "billing_period": "monthly"},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan_a["id"],
            "status": "active",
        },
    ).json()

    # 1. Same plan
    same_res = client.post(
        f"/api/subscriptions/{sub['id']}/change-plan",
        headers=headers,
        json={"new_plan_id": plan_a["id"]},
    )
    assert same_res.status_code == 400
    assert "already enrolled" in same_res.json()["detail"]

    # 2. Non-existent plan
    not_found_res = client.post(
        f"/api/subscriptions/{sub['id']}/change-plan",
        headers=headers,
        json={"new_plan_id": 999999},
    )
    assert not_found_res.status_code == 404

    # 3. Closed subscription
    client.post(
        f"/api/subscriptions/{sub['id']}/status",
        headers=headers,
        json={"status": "closed"},
    )
    closed_res = client.post(
        f"/api/subscriptions/{sub['id']}/change-plan",
        headers=headers,
        json={"new_plan_id": plan_b["id"]},
    )
    assert closed_res.status_code == 400
    assert "closed" in closed_res.json()["detail"]
