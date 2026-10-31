from datetime import date, timedelta
import pytest
from backend.app.models.invoice import Invoice
from backend.tests.test_crud import auth_tokens


def test_dunning_run_milestones(client, auth_tokens, db_session):
    """
    Test POST /api/dunning/run:
    - Automatically creates day 1, day 3, day 7 reminders for overdue invoices.
    - Prevents duplicate reminders for the same invoice & milestone.
    - Logs activity and saves to reminders table.
    """
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # 1. Setup Customer, Plan, Product, Subscription
    cust = client.post(
        "/api/customers",
        headers=admin_headers,
        json={"name": "Overdue Customer", "email": "overdue@customer.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=admin_headers,
        json={"name": "Dunning Plan", "price": 450.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=admin_headers,
        json={"name": "Cloud Storage", "sales_price": 450.0},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=admin_headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # 2. Create invoice and set due_date to 2 days ago (days_overdue = 2)
    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=admin_headers).json()
    inv_model = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()
    inv_model.due_date = date.today() - timedelta(days=2)
    db_session.commit()

    # 3. Run dunning -> Should create Day 1 reminder (milestone 1 is reached)
    run1 = client.post("/api/dunning/run", headers=admin_headers)
    assert run1.status_code == 200, run1.text
    data1 = run1.json()
    assert data1["reminders_created"] == 1
    assert data1["reminders"][0]["day_offset"] == 1
    assert data1["reminders"][0]["invoice_id"] == inv["id"]

    # 4. Immediate second run -> No duplicate reminders should be created
    run1_dup = client.post("/api/dunning/run", headers=admin_headers).json()
    assert run1_dup["reminders_created"] == 0

    # 5. Advance due_date to 4 days ago (days_overdue = 4)
    # Milestone 1 was already created; Milestone 3 is now reached!
    inv_model.due_date = date.today() - timedelta(days=4)
    db_session.commit()

    run2 = client.post("/api/dunning/run", headers=admin_headers).json()
    assert run2["reminders_created"] == 1
    assert run2["reminders"][0]["day_offset"] == 3

    # 6. Advance due_date to 8 days ago (days_overdue = 8)
    # Milestone 7 is now reached!
    inv_model.due_date = date.today() - timedelta(days=8)
    db_session.commit()

    run3 = client.post("/api/dunning/run", headers=admin_headers).json()
    assert run3["reminders_created"] == 1
    assert run3["reminders"][0]["day_offset"] == 7

    # 7. List reminders
    reminders_list = client.get(f"/api/dunning/reminders?invoice_id={inv['id']}", headers=admin_headers).json()
    assert len(reminders_list) == 3
    offsets = {r["day_offset"] for r in reminders_list}
    assert offsets == {1, 3, 7}


def test_dunning_recovered_amount_and_dashboard(client, auth_tokens, db_session):
    """
    Test smart dunning recovery tracking:
    - Dashboard and dunning stats report overdue amount recovered after reminders.
    """
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    cust = client.post(
        "/api/customers",
        headers=admin_headers,
        json={"name": "Recovered Customer", "email": "recovered@customer.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=admin_headers,
        json={"name": "Recovery Plan", "price": 800.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=admin_headers,
        json={"name": "Enterprise Suite", "sales_price": 800.0},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=admin_headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # Create invoice and make it overdue by 5 days
    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=admin_headers).json()
    inv_model = db_session.query(Invoice).filter(Invoice.id == inv["id"]).first()
    inv_model.due_date = date.today() - timedelta(days=5)
    db_session.commit()

    # Run dunning -> creates reminders
    client.post("/api/dunning/run", headers=admin_headers)

    # Initial stats -> recovered should be 0.0 before payment
    stats_before = client.get("/api/dunning/stats", headers=admin_headers).json()
    assert stats_before["total_reminders_sent"] >= 1
    assert stats_before["overdue_amount_recovered"] == 0.0

    # Customer pays 500.0 against reminded overdue invoice
    client.post(
        f"/api/invoices/{inv['id']}/payments",
        headers=admin_headers,
        json={"method": "upi", "amount": 500.0, "note": "Payment after reminder"},
    )

    # Dunning stats should now report 500.0 recovered
    stats_after = client.get("/api/dunning/stats", headers=admin_headers).json()
    assert stats_after["overdue_amount_recovered"] == 500.0

    # Dashboard summary should also show overdue amount recovered
    dash = client.get("/api/dashboard/summary", headers=admin_headers).json()
    assert dash["overdue_amount_recovered"] >= 500.0


def test_dunning_role_guard(client, auth_tokens):
    """Portal users cannot trigger smart dunning runs."""
    portal_headers = {"Authorization": f"Bearer {auth_tokens['portal']}"}
    res = client.post("/api/dunning/run", headers=portal_headers)
    assert res.status_code == 403
