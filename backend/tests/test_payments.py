from datetime import date, timedelta
import pytest
from backend.app.models.invoice import Invoice
from backend.tests.test_crud import auth_tokens


def test_payment_and_auto_set_paid(client, auth_tokens):
    """
    Test POST /api/invoices/{id}/payments:
    - Records partial payment, keeps status confirmed
    - Auto sets status to 'paid' when amount_paid >= total
    """
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    # Setup Customer, Plan, Product, Subscription
    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Payment User", "email": "payment@test.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Monthly Pro", "price": 1000.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "SaaS Platform", "sales_price": 500.0},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 2}],  # 2 * 500 = 1000
        },
    ).json()

    # Create Invoice (total = 1000.0)
    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers).json()
    inv_id = inv["id"]
    assert inv["total"] == 1000.0
    assert inv["amount_paid"] == 0.0

    # 1. Record Partial Payment (400 via upi)
    p1_res = client.post(
        f"/api/invoices/{inv_id}/payments",
        headers=headers,
        json={"method": "upi", "amount": 400.0, "note": "First installment"},
    )
    assert p1_res.status_code == 201, p1_res.text
    p1 = p1_res.json()
    assert p1["amount"] == 400.0
    assert p1["method"] == "upi"

    # Check invoice after partial payment
    inv_refreshed = client.get(f"/api/invoices/{inv_id}", headers=headers).json()
    assert inv_refreshed["amount_paid"] == 400.0
    assert inv_refreshed["status"] != "paid"

    # 2. Record Remaining Payment (600 via card) -> amount_paid becomes 1000 >= total
    p2_res = client.post(
        f"/api/invoices/{inv_id}/payments",
        headers=headers,
        json={"method": "card", "amount": 600.0, "note": "Final settlement"},
    )
    assert p2_res.status_code == 201

    # Check invoice status automatically set to paid
    inv_paid = client.get(f"/api/invoices/{inv_id}", headers=headers).json()
    assert inv_paid["amount_paid"] == 1000.0
    assert inv_paid["status"] == "paid"

    # 3. Check GET /api/invoices/{id}/payments
    payments_list = client.get(f"/api/invoices/{inv_id}/payments", headers=headers).json()
    assert len(payments_list) == 2


def test_invoices_outstanding_and_overdue_filters(client, auth_tokens, db_session):
    """
    Test GET /api/invoices?status=outstanding and ?overdue=true.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Filter User", "email": "filter@test.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Weekly Basic", "price": 200.0, "billing_period": "weekly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Addon", "sales_price": 200.0},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # Generate invoice (total = 200)
    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers).json()
    inv_id = inv["id"]

    # 1. Invoice is initially draft/unpaid -> appears in ?status=outstanding
    out_res = client.get("/api/invoices?status=outstanding", headers=headers)
    assert out_res.status_code == 200
    assert any(i["id"] == inv_id for i in out_res.json())

    # 2. Make invoice overdue by setting due_date in the past
    inv_model = db_session.query(Invoice).filter(Invoice.id == inv_id).first()
    inv_model.due_date = date.today() - timedelta(days=5)
    db_session.commit()

    # Appears in ?overdue=true
    overdue_res = client.get("/api/invoices?overdue=true", headers=headers)
    assert overdue_res.status_code == 200
    assert any(i["id"] == inv_id for i in overdue_res.json())

    # 3. Pay the invoice in full
    client.post(
        f"/api/invoices/{inv_id}/payments",
        headers=headers,
        json={"method": "cash", "amount": 200.0},
    )

    # 4. Now that it is PAID:
    # Must NOT appear in ?status=outstanding
    out_after = client.get("/api/invoices?status=outstanding", headers=headers).json()
    assert not any(i["id"] == inv_id for i in out_after)

    # Must NOT appear in ?overdue=true
    overdue_after = client.get("/api/invoices?overdue=true", headers=headers).json()
    assert not any(i["id"] == inv_id for i in overdue_after)


def test_payment_validations_and_cancelled_invoice(client, auth_tokens):
    """
    Test payments validations:
    - Cannot pay cancelled invoice (400)
    - Invalid payment method rejected (400)
    """
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Cancel Cust", "email": "cancel@test.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Basic", "price": 100.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Service Item", "sales_price": 100.0},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers).json()
    inv_id = inv["id"]

    # 1. Invalid payment method -> 400
    invalid_method_res = client.post(
        f"/api/invoices/{inv_id}/payments",
        headers=headers,
        json={"method": "crypto", "amount": 50.0},
    )
    assert invalid_method_res.status_code == 400
    assert "Invalid payment method" in invalid_method_res.json()["detail"]

    # 2. Cancel invoice
    client.post(f"/api/invoices/{inv_id}/cancel", headers=headers)

    # 3. Attempting to record payment on cancelled invoice -> 400
    pay_cancelled_res = client.post(
        f"/api/invoices/{inv_id}/payments",
        headers=headers,
        json={"method": "bank", "amount": 100.0},
    )
    assert pay_cancelled_res.status_code == 400
    assert "cancelled invoice" in pay_cancelled_res.json()["detail"]
