from datetime import date, timedelta
import pytest
from backend.tests.test_crud import auth_tokens


def test_auto_numbering_and_line_calculation(client, auth_tokens):
    """Test auto numbering SUB-0001, SUB-0002 and auto-calculation of line amounts."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    # 1. Setup Master Data
    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Client 1", "email": "client1@test.com", "gst_state": "Odisha"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Monthly Pro", "price": 1000.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={
            "name": "Cloud Storage",
            "sales_price": 100.0,
            "variants": [{"attribute": "Brand", "value": "Odoo", "extra_price": 50.0}],
        },
    ).json()
    variant_id = prod["variants"][0]["id"]

    # Tax 10%
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    tax = client.post(
        "/api/taxes",
        headers=admin_headers,
        json={"name": "VAT 10%", "rate_percent": 10.0, "type": "gst"},
    ).json()

    # Discount 20%
    disc = client.post(
        "/api/discounts",
        headers=admin_headers,
        json={
            "name": "PROMO20",
            "type": "percent",
            "value": 20.0,
            "applies_to": "product",
            "product_id": prod["id"],
        },
    ).json()

    # 2. Create first subscription:
    # unit_price = 100 + 50 = 150. qty = 2 -> base = 300.
    # discount 20% of 300 = 60 -> discounted = 240.
    # tax 10% of 240 = 24 -> line total = 264.
    sub1_payload = {
        "customer_id": cust["id"],
        "plan_id": plan["id"],
        "lines": [
            {
                "product_id": prod["id"],
                "variant_id": variant_id,
                "qty": 2,
                "tax_id": tax["id"],
                "discount_id": disc["id"],
            }
        ],
    }
    sub1_res = client.post("/api/subscriptions", headers=headers, json=sub1_payload)
    assert sub1_res.status_code == 201, sub1_res.text
    sub1 = sub1_res.json()
    assert sub1["number"] == "SUB-0001"
    assert len(sub1["lines"]) == 1
    assert sub1["lines"][0]["unit_price"] == 150.0
    assert sub1["lines"][0]["amount"] == 264.0
    assert sub1["total_amount"] == 264.0

    # 3. Create second subscription -> must be SUB-0002
    sub2_payload = {
        "customer_id": cust["id"],
        "plan_id": plan["id"],
        "lines": [
            {"product_id": prod["id"], "qty": 1}
        ],
    }
    sub2_res = client.post("/api/subscriptions", headers=headers, json=sub2_payload)
    assert sub2_res.status_code == 201
    sub2 = sub2_res.json()
    assert sub2["number"] == "SUB-0002"
    assert sub2["lines"][0]["amount"] == 100.0


def test_create_from_quotation_template(client, auth_tokens):
    """Test POST /api/subscriptions/from-template/{id}."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    # Setup Customer, Plan, Product, Template
    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Template Customer", "email": "tpl@customer.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Annual Plan", "price": 12000.0, "billing_period": "yearly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Support Package", "sales_price": 500.0},
    ).json()

    tpl = client.post(
        "/api/templates",
        headers=headers,
        json={
            "name": "Standard Enterprise Offer",
            "validity_days": 14,
            "plan_id": plan["id"],
            "lines": [{"product_id": prod["id"], "qty": 3}],
        },
    ).json()

    # Create subscription from template
    from_tpl_res = client.post(
        f"/api/subscriptions/from-template/{tpl['id']}",
        headers=headers,
        json={"customer_id": cust["id"]},
    )
    assert from_tpl_res.status_code == 201, from_tpl_res.text
    sub = from_tpl_res.json()
    assert sub["status"] == "quotation"
    assert sub["plan_id"] == plan["id"]
    assert len(sub["lines"]) == 1
    assert sub["lines"][0]["qty"] == 3
    assert sub["lines"][0]["amount"] == 1500.0


def test_status_transitions_and_plan_permissions(client, auth_tokens):
    """
    Test allowed status transitions and plan permissions:
    - pausable check
    - closable check
    - renewable check
    """
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Status Customer", "email": "status@test.com"},
    ).json()

    # Plan with pausable=False, closable=False
    strict_plan = client.post(
        "/api/plans",
        headers=headers,
        json={
            "name": "Strict Locked Plan",
            "price": 2000.0,
            "billing_period": "monthly",
            "pausable": False,
            "closable": False,
            "renewable": True,
        },
    ).json()

    # Create subscription in draft
    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={"customer_id": cust["id"], "plan_id": strict_plan["id"], "status": "draft"},
    ).json()
    sub_id = sub["id"]

    # 1. Invalid transition directly to active from draft -> 400
    res_inv = client.post(f"/api/subscriptions/{sub_id}/status", headers=headers, json={"status": "active"})
    assert res_inv.status_code == 400

    # 2. Transition draft -> confirmed -> active
    client.post(f"/api/subscriptions/{sub_id}/status", headers=headers, json={"status": "confirmed"})
    active_res = client.post(f"/api/subscriptions/{sub_id}/status", headers=headers, json={"status": "active"})
    assert active_res.status_code == 200
    assert active_res.json()["status"] == "active"

    # 3. Try to pause strict plan -> fails because pausable=False
    pause_fail = client.post(f"/api/subscriptions/{sub_id}/pause", headers=headers)
    assert pause_fail.status_code == 400
    assert "does not allow pausing" in pause_fail.json()["detail"]

    # 4. Try to close strict plan -> fails because closable=False
    close_fail = client.post(f"/api/subscriptions/{sub_id}/close", headers=headers)
    assert close_fail.status_code == 400
    assert "does not allow closing" in close_fail.json()["detail"]

    # 5. Now test flexible plan with pausable=True, closable=True, renewable=True
    flex_plan = client.post(
        "/api/plans",
        headers=headers,
        json={
            "name": "Flexible Plan",
            "price": 500.0,
            "billing_period": "monthly",
            "pausable": True,
            "closable": True,
            "renewable": True,
        },
    ).json()

    flex_sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={"customer_id": cust["id"], "plan_id": flex_plan["id"], "status": "draft"},
    ).json()
    flex_id = flex_sub["id"]

    # Transition to active
    client.post(f"/api/subscriptions/{flex_id}/status", headers=headers, json={"status": "confirmed"})
    client.post(f"/api/subscriptions/{flex_id}/status", headers=headers, json={"status": "active"})

    # Pause
    pause_ok = client.post(f"/api/subscriptions/{flex_id}/pause", headers=headers)
    assert pause_ok.status_code == 200
    assert pause_ok.json()["status"] == "paused"

    # Resume to active
    resume_ok = client.post(f"/api/subscriptions/{flex_id}/status", headers=headers, json={"status": "active"})
    assert resume_ok.status_code == 200
    assert resume_ok.json()["status"] == "active"

    # Renew
    old_next_billing = resume_ok.json()["next_billing_date"]
    renew_ok = client.post(f"/api/subscriptions/{flex_id}/renew", headers=headers)
    assert renew_ok.status_code == 200
    assert renew_ok.json()["next_billing_date"] != old_next_billing

    # Close
    close_ok = client.post(f"/api/subscriptions/{flex_id}/close", headers=headers)
    assert close_ok.status_code == 200
    assert close_ok.json()["status"] == "closed"


def test_auto_close_plans(client, auth_tokens):
    """Test plans with auto_close close automatically after end_date."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Auto Close Customer", "email": "autoclose@test.com"},
    ).json()

    # Plan with auto_close=True and end_date in the past
    past_date = date.today() - timedelta(days=5)
    auto_close_plan = client.post(
        "/api/plans",
        headers=headers,
        json={
            "name": "Promo Flash Plan",
            "price": 100.0,
            "billing_period": "monthly",
            "auto_close": True,
            "end_date": str(past_date),
        },
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": auto_close_plan["id"],
            "status": "active",
        },
    ).json()

    # When fetching the subscription, it should automatically evaluate to closed
    get_res = client.get(f"/api/subscriptions/{sub['id']}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "closed"


def test_subscription_timeline(client, auth_tokens):
    """Test activity timeline logs status transitions and actions."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Timeline User", "email": "timeline@test.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Timeline Plan", "price": 300.0, "billing_period": "monthly"},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={"customer_id": cust["id"], "plan_id": plan["id"], "status": "draft"},
    ).json()
    sub_id = sub["id"]

    # Transition draft -> quotation -> confirmed
    client.post(f"/api/subscriptions/{sub_id}/status", headers=headers, json={"status": "quotation"})
    client.post(f"/api/subscriptions/{sub_id}/status", headers=headers, json={"status": "confirmed"})

    timeline_res = client.get(f"/api/subscriptions/{sub_id}/timeline", headers=headers)
    assert timeline_res.status_code == 200
    logs = timeline_res.json()
    assert len(logs) >= 3  # created, quotation, confirmed
    actions = [l["action"] for l in logs]
    assert "created" in actions
    assert "status_change" in actions
