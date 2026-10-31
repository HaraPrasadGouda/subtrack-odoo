from datetime import date, timedelta
import pytest
from backend.app.models.invoice import Invoice
from backend.tests.test_crud import auth_tokens


def test_customer_risk_scoring(client, auth_tokens, db_session):
    """
    Test GET /api/customers/{id}/risk:
    - Calculates risk score and level (Low, Medium, High)
    - Reasons list includes signals from overdue invoices, paused subs, expiry <= 15 days, late payments
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # 1. Low risk customer
    cust_healthy = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Healthy Customer", "email": "healthy@risk.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Risk Plan", "price": 100.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Cloud Node", "sales_price": 100.0},
    ).json()

    # Active subscription expiring in 6 months
    client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust_healthy["id"],
            "plan_id": plan["id"],
            "status": "active",
            "expiry_date": str(date.today() + timedelta(days=180)),
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    )

    healthy_risk = client.get(f"/api/customers/{cust_healthy['id']}/risk", headers=headers).json()
    assert healthy_risk["risk_level"] == "Low"
    assert healthy_risk["risk_score"] < 25
    assert len(healthy_risk["reasons"]) >= 1

    # 2. High risk customer
    cust_at_risk = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Risky Customer", "email": "risky@risk.com"},
    ).json()

    # Signal A: Paused subscription
    sub_paused = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust_at_risk["id"],
            "plan_id": plan["id"],
            "status": "paused",
            "expiry_date": str(date.today() + timedelta(days=5)),  # Signal B: Expiring in 5 days
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # Signal C: Overdue invoice
    inv = client.post(f"/api/subscriptions/{sub_paused['id']}/invoice", headers=headers).json()
    inv_model = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()
    inv_model.due_date = date.today() - timedelta(days=10)
    db_session.commit()

    # Signal D: Late payment on a prior invoice
    inv_prior = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust_at_risk["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()
    inv_paid_late = client.post(f"/api/subscriptions/{inv_prior['id']}/invoice", headers=headers).json()
    inv_paid_late_model = db_session.query(Invoice).filter(Invoice.id == inv_paid_late["id"]).first()
    inv_paid_late_model.due_date = date.today() - timedelta(days=20)
    db_session.commit()

    # Pay the invoice today (which is after due_date -> late payment)
    client.post(
        f"/api/invoices/{inv_paid_late['id']}/payments",
        headers=headers,
        json={"method": "bank", "amount": 100.0, "date": str(date.today())},
    )

    risk_report = client.get(f"/api/customers/{cust_at_risk['id']}/risk", headers=headers).json()
    assert risk_report["risk_level"] == "High"
    assert risk_report["risk_score"] >= 50
    assert risk_report["overdue_invoices_count"] >= 1
    assert risk_report["paused_subscriptions_count"] >= 1
    assert risk_report["expiring_subscriptions_count"] >= 1
    assert risk_report["late_payments_count"] >= 1
    assert len(risk_report["reasons"]) >= 3


def test_customer_list_includes_risk_field(client, auth_tokens):
    """
    Test that GET /api/customers includes risk_level and risk_score fields.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    client.post(
        "/api/customers",
        headers=headers,
        json={"name": "List Risk Customer", "email": "listrisk@test.com"},
    )

    customers = client.get("/api/customers", headers=headers).json()
    assert len(customers) >= 1
    for c in customers:
        assert "risk_level" in c
        assert c["risk_level"] in ["Low", "Medium", "High"]
        assert "risk_score" in c
        assert isinstance(c["risk_score"], int)
