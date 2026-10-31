from datetime import date
import pytest
from backend.tests.test_crud import auth_tokens


def test_portal_subscriptions_isolation(client, auth_tokens):
    """
    Test GET /api/portal/subscriptions:
    Portal customer must only see their own subscriptions, never another customer's.
    """
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    portal_headers = {"Authorization": f"Bearer {auth_tokens['portal']}"}

    # 1. Setup two customers: Customer A (Portal user) and Customer B (Other)
    cust_a = client.post(
        "/api/customers",
        headers=admin_headers,
        json={"name": "Portal Customer", "email": "portal@customer.com"},
    ).json()

    cust_b = client.post(
        "/api/customers",
        headers=admin_headers,
        json={"name": "Other Customer", "email": "other@company.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=admin_headers,
        json={"name": "Portal Plan", "price": 200.0, "billing_period": "monthly", "pausable": True, "closable": True},
    ).json()

    prod = client.post(
        "/api/products",
        headers=admin_headers,
        json={"name": "Portal SaaS", "sales_price": 200.0},
    ).json()

    # 2. Create sub for Cust A and sub for Cust B
    sub_a = client.post(
        "/api/subscriptions",
        headers=admin_headers,
        json={
            "customer_id": cust_a["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    sub_b = client.post(
        "/api/subscriptions",
        headers=admin_headers,
        json={
            "customer_id": cust_b["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # 3. Portal user lists subscriptions
    portal_subs = client.get("/api/portal/subscriptions", headers=portal_headers).json()
    assert len(portal_subs) == 1
    assert portal_subs[0]["id"] == sub_a["id"]
    assert portal_subs[0]["customer_id"] == cust_a["id"]

    # 4. Portal user tries to view sub_b directly -> 404
    b_view = client.get(f"/api/portal/subscriptions/{sub_b['id']}", headers=portal_headers)
    assert b_view.status_code == 404


def test_portal_pause_and_cancel_rules(client, auth_tokens):
    """
    Test customer pausing and cancelling own subscription:
    - Allowed if plan permits (pausable=True, closable=True)
    - Blocked if plan forbids
    """
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    portal_headers = {"Authorization": f"Bearer {auth_tokens['portal']}"}

    # Plans with restricted settings
    strict_plan = client.post(
        "/api/plans",
        headers=admin_headers,
        json={"name": "Strict Plan", "price": 100.0, "billing_period": "monthly", "pausable": False, "closable": False},
    ).json()

    flexible_plan = client.post(
        "/api/plans",
        headers=admin_headers,
        json={"name": "Flexible Plan", "price": 100.0, "billing_period": "monthly", "pausable": True, "closable": True},
    ).json()

    prod = client.post(
        "/api/products",
        headers=admin_headers,
        json={"name": "Basic Cloud", "sales_price": 100.0},
    ).json()

    # Link customer contact
    cust = client.post(
        "/api/customers",
        headers=admin_headers,
        json={"name": "Portal Customer", "email": "portal@customer.com"},
    ).json()

    # Sub with strict plan
    sub_strict = client.post(
        "/api/subscriptions",
        headers=admin_headers,
        json={
            "customer_id": cust["id"],
            "plan_id": strict_plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # Sub with flexible plan
    sub_flex = client.post(
        "/api/subscriptions",
        headers=admin_headers,
        json={
            "customer_id": cust["id"],
            "plan_id": flexible_plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # 1. Strict plan: pause should fail (400)
    pause_fail = client.post(f"/api/portal/subscriptions/{sub_strict['id']}/pause", headers=portal_headers)
    assert pause_fail.status_code == 400
    assert "does not permit pausing" in pause_fail.json()["detail"]

    # 2. Strict plan: cancel should fail (400)
    cancel_fail = client.post(f"/api/portal/subscriptions/{sub_strict['id']}/cancel", headers=portal_headers)
    assert cancel_fail.status_code == 400
    assert "does not permit cancellation" in cancel_fail.json()["detail"]

    # 3. Flexible plan: pause should succeed
    pause_ok = client.post(f"/api/portal/subscriptions/{sub_flex['id']}/pause", headers=portal_headers)
    assert pause_ok.status_code == 200
    assert pause_ok.json()["status"] == "paused"

    # 4. Flexible plan: cancel/close should succeed
    cancel_ok = client.post(f"/api/portal/subscriptions/{sub_flex['id']}/cancel", headers=portal_headers)
    assert cancel_ok.status_code == 200
    assert cancel_ok.json()["status"] == "closed"


def test_portal_invoices_and_payment(client, auth_tokens):
    """
    Test GET /api/portal/invoices and POST /api/portal/invoices/{id}/pay:
    - Customer views only own invoices
    - Full payment auto settles invoice (status: paid)
    - Blocked from paying another customer's invoice (404)
    """
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    portal_headers = {"Authorization": f"Bearer {auth_tokens['portal']}"}

    # Setup Customer A (Portal user) & Customer B
    cust_a = client.post(
        "/api/customers",
        headers=admin_headers,
        json={"name": "Portal Customer", "email": "portal@customer.com"},
    ).json()

    cust_b = client.post(
        "/api/customers",
        headers=admin_headers,
        json={"name": "Someone Else", "email": "other2@company.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=admin_headers,
        json={"name": "Pro Plan", "price": 300.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=admin_headers,
        json={"name": "Pro License", "sales_price": 300.0},
    ).json()

    sub_a = client.post(
        "/api/subscriptions",
        headers=admin_headers,
        json={
            "customer_id": cust_a["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    sub_b = client.post(
        "/api/subscriptions",
        headers=admin_headers,
        json={
            "customer_id": cust_b["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # Generate invoices
    inv_a = client.post(f"/api/subscriptions/{sub_a['id']}/invoice", headers=admin_headers).json()
    inv_b = client.post(f"/api/subscriptions/{sub_b['id']}/invoice", headers=admin_headers).json()

    # 1. Customer A sees only inv_a in portal list
    portal_invs = client.get("/api/portal/invoices", headers=portal_headers).json()
    assert len(portal_invs) == 1
    assert portal_invs[0]["id"] == inv_a["id"]

    # 2. Customer A cannot view or pay Customer B's invoice
    b_pay = client.post(f"/api/portal/invoices/{inv_b['id']}/pay", headers=portal_headers, json={"method": "card"})
    assert b_pay.status_code == 404

    # 3. Customer A pays inv_a full balance
    pay_res = client.post(
        f"/api/portal/invoices/{inv_a['id']}/pay",
        headers=portal_headers,
        json={"method": "card", "note": "Online payment via portal"},
    )
    assert pay_res.status_code == 201, pay_res.text
    payment = pay_res.json()
    assert payment["amount"] == 300.0
    assert payment["method"] == "card"

    # 4. Check that invoice is now paid
    inv_checked = client.get(f"/api/portal/invoices/{inv_a['id']}", headers=portal_headers).json()
    assert inv_checked["status"] == "paid"
    assert inv_checked["amount_paid"] == 300.0
