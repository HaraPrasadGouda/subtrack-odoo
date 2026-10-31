import time
from datetime import date, timedelta
import pytest
from backend.app.models.subscription import Subscription, SubscriptionStatus
from backend.app.models.invoice import Invoice, InvoiceStatus, Payment
from backend.tests.test_crud import auth_tokens


def test_dashboard_summary_metrics(client, auth_tokens, db_session):
    """
    Test GET /api/dashboard/summary:
    - active_subscriptions
    - status_breakdown
    - revenue_this_month & payments
    - outstanding_amount & overdue_count
    """
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Dash User", "email": "dash@user.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Dash Plan", "price": 500.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Core Module", "sales_price": 500.0},
    ).json()

    # 1. Create an active subscription
    sub1 = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # 2. Create a paused subscription
    sub2 = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "paused",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # 3. Create an invoice and pay partially
    inv1_res = client.post(f"/api/subscriptions/{sub1['id']}/invoice", headers=headers)
    assert inv1_res.status_code in [200, 201], f"inv1 creation failed: {inv1_res.text}"
    inv1 = inv1_res.json()
    pay_res = client.post(
        f"/api/invoices/{inv1['id']}/payments",
        headers=headers,
        json={"method": "upi", "amount": 200.0, "date": str(date.today())},
    )
    assert pay_res.status_code == 201, f"pay_res failed: {pay_res.text}"

    # 4. Create an overdue invoice (use sub2 to avoid duplicate period billing)
    inv2_res = client.post(f"/api/subscriptions/{sub2['id']}/invoice", headers=headers)
    assert inv2_res.status_code in [200, 201], f"inv2 creation failed: {inv2_res.text}"
    inv2 = inv2_res.json()
    inv2_model = db_session.query(Invoice).filter(Invoice.id == inv2["id"]).first()
    inv2_model.due_date = date.today() - timedelta(days=10)
    db_session.commit()

    # 5. Fetch Dashboard Summary
    dash_res = client.get("/api/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200, dash_res.text
    summary = dash_res.json()

    assert summary["active_subscriptions"] >= 1
    assert summary["total_subscriptions"] >= 2
    assert summary["status_breakdown"]["active"] >= 1
    assert summary["status_breakdown"]["paused"] >= 1
    assert summary["payments_total"] >= 200.0
    assert summary["outstanding_count"] >= 2
    assert summary["overdue_count"] >= 1
    assert "overdue_amount_recovered" in summary


def test_dashboard_date_range_filter(client, auth_tokens):
    """Test dashboard summary with date range filter for payments/revenue."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Date User", "email": "date@user.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Plan X", "price": 100.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Item X", "sales_price": 100.0},
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

    inv_res = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers)
    assert inv_res.status_code in [200, 201], f"inv failed: {inv_res.text}"
    inv = inv_res.json()

    # Payment in the past (e.g. 60 days ago)
    past_date = date.today() - timedelta(days=60)
    pay_res = client.post(
        f"/api/invoices/{inv['id']}/payments",
        headers=headers,
        json={"method": "bank", "amount": 100.0, "date": str(past_date)},
    )
    assert pay_res.status_code == 201, f"pay failed: {pay_res.text}"

    # Date range for today only -> should NOT include payment from 60 days ago
    res_today = client.get(
        f"/api/dashboard/summary?start_date={date.today()}&end_date={date.today()}",
        headers=headers,
    ).json()
    assert res_today["payments_total"] == 0.0

    # Date range covering past_date -> should include the payment
    res_past = client.get(
        f"/api/dashboard/summary?start_date={past_date - timedelta(days=1)}&end_date={date.today()}",
        headers=headers,
    ).json()
    assert res_past["payments_total"] >= 100.0


def test_pagination_page_size(client, auth_tokens):
    """Test (page, size) pagination across list endpoints."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    # Create 3 customers
    c1 = client.post("/api/customers", headers=headers, json={"name": "User Alpha", "email": "alpha@p.com"}).json()
    c2 = client.post("/api/customers", headers=headers, json={"name": "User Beta", "email": "beta@p.com"}).json()
    c3 = client.post("/api/customers", headers=headers, json={"name": "User Gamma", "email": "gamma@p.com"}).json()

    # Page 1 with size 2
    p1 = client.get("/api/customers?page=1&size=2", headers=headers).json()
    assert len(p1) == 2

    # Page 2 with size 2
    p2 = client.get("/api/customers?page=2&size=2", headers=headers).json()
    assert len(p2) >= 1

    # Items on p1 and p2 must not overlap
    p1_ids = {item["id"] for item in p1}
    p2_ids = {item["id"] for item in p2}
    assert len(p1_ids.intersection(p2_ids)) == 0


def test_speed_with_5000_seeded_subscriptions(client, auth_tokens, db_session):
    """
    Every page < 2 s with 5,000 seeded subscriptions.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Bulk Cust", "email": "bulk@cust.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Bulk Plan", "price": 100.0, "billing_period": "monthly"},
    ).json()

    # Bulk insert 5,000 subscriptions
    today = date.today()
    subs = []
    for i in range(1, 5001):
        subs.append(
            Subscription(
                number=f"SUB-BULK-{i:05d}",
                customer_id=cust["id"],
                plan_id=plan["id"],
                start_date=today,
                next_billing_date=today,
                status=SubscriptionStatus.ACTIVE.value if (i % 2 == 0) else SubscriptionStatus.PAUSED.value,
            )
        )
    db_session.bulk_save_objects(subs)
    db_session.commit()

    # Query page 1 (size 50) and measure response time
    start_time = time.time()
    res = client.get("/api/subscriptions?page=1&size=50", headers=headers)
    elapsed_time = time.time() - start_time

    assert res.status_code == 200
    assert len(res.json()) == 50
    # Must be strictly under 2.0 seconds
    assert elapsed_time < 2.0, f"Query took {elapsed_time:.3f}s, expected < 2.0s"
    print(f"\n[BENCHMARK] 5,000 subscriptions page fetch took: {elapsed_time:.4f}s")

