from datetime import date, timedelta
import pytest
from backend.app.models.invoice import Invoice
from backend.tests.test_crud import auth_tokens


def test_revenue_analytics_mrr_arr(client, auth_tokens):
    """
    Test GET /api/analytics:
    MRR calculations with normalized frequencies:
    - yearly: amount / 12
    - weekly: amount * 4.33
    - daily: amount * 30
    - monthly: amount
    ARR = MRR * 12
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Analytics Corp", "email": "corp@analytics.com"},
    ).json()

    # 1. Yearly plan: 1200/yr -> MRR = 100.0
    p_yr = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Yearly Enterprise", "price": 1200.0, "billing_period": "yearly"},
    ).json()

    # 2. Weekly plan: 100/wk -> MRR = 433.0 (100 * 4.33)
    p_wk = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Weekly Flex", "price": 100.0, "billing_period": "weekly"},
    ).json()

    # 3. Daily plan: 10/day -> MRR = 300.0 (10 * 30)
    p_dy = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Daily Pass", "price": 10.0, "billing_period": "daily"},
    ).json()

    # 4. Monthly plan: 200/mo -> MRR = 200.0
    p_mo = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Monthly Standard", "price": 200.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "SaaS Seat", "sales_price": 0.0},  # Price driven by plan
    ).json()

    # Create active subscriptions for each
    client.post(
        "/api/subscriptions",
        headers=headers,
        json={"customer_id": cust["id"], "plan_id": p_yr["id"], "status": "active"},
    )
    client.post(
        "/api/subscriptions",
        headers=headers,
        json={"customer_id": cust["id"], "plan_id": p_wk["id"], "status": "active"},
    )
    client.post(
        "/api/subscriptions",
        headers=headers,
        json={"customer_id": cust["id"], "plan_id": p_dy["id"], "status": "active"},
    )
    client.post(
        "/api/subscriptions",
        headers=headers,
        json={"customer_id": cust["id"], "plan_id": p_mo["id"], "status": "active"},
    )

    analytics = client.get("/api/analytics", headers=headers).json()

    # Expected MRR: 100.0 + 433.0 + 300.0 + 200.0 = 1033.0
    expected_mrr = 100.0 + 433.0 + 300.0 + 200.0
    assert analytics["mrr"] == pytest.approx(expected_mrr, 0.01)
    assert analytics["arr"] == pytest.approx(expected_mrr * 12, 0.01)
    assert analytics["active_subscriptions_count"] == 4


def test_analytics_churn_and_expected_revenue(client, auth_tokens):
    """
    Test churn % and expected revenue in next 30 days.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Churn Test Cust", "email": "churn@test.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Monthly 500", "price": 500.0, "billing_period": "monthly", "closable": True},
    ).json()

    # Sub 1: Active with billing date in 10 days (counted in expected revenue 30d)
    s1 = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "next_billing_date": str(date.today() + timedelta(days=10)),
        },
    ).json()

    # Sub 2: Active with billing date in 45 days (NOT counted in expected revenue 30d)
    s2 = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "next_billing_date": str(date.today() + timedelta(days=45)),
        },
    ).json()

    # Sub 3: Closed subscription -> contributes to churn %
    s3 = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "closed",
        },
    ).json()

    analytics = client.get("/api/analytics", headers=headers).json()

    # Expected revenue for next 30 days should be 500.0 (from s1 only)
    assert analytics["expected_revenue_30d"] == 500.0

    # Churn %: 1 closed / (2 active + 1 closed) = 33.33%
    assert analytics["churn_rate_percent"] == pytest.approx(33.33, 0.1)


def test_analytics_monthly_revenue_last_6_months(client, auth_tokens):
    """
    Test 6-month historical monthly revenue series.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "History Cust", "email": "history@test.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Monthly 250", "price": 250.0, "billing_period": "monthly"},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={"customer_id": cust["id"], "plan_id": plan["id"], "status": "active"},
    ).json()

    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers).json()

    # Record payment for today
    client.post(
        f"/api/invoices/{inv['id']}/payments",
        headers=headers,
        json={"method": "card", "amount": 250.0, "date": str(date.today())},
    )

    analytics = client.get("/api/analytics", headers=headers).json()
    series = analytics["monthly_revenue_last_6_months"]

    # Must contain exactly 6 monthly periods
    assert len(series) == 6

    # Current month (last item in series) should have at least 250.0 revenue
    current_month_item = series[-1]
    assert current_month_item["revenue"] >= 250.0
    assert current_month_item["payments_count"] >= 1
    assert current_month_item["month"] == f"{date.today().year:04d}-{date.today().month:02d}"

