import pytest
from backend.tests.test_crud import auth_tokens


def test_gst_split_odisha_intrastate(client, auth_tokens):
    """
    Step 13: GST Rule
    If customer gst_state == company state (Odisha) -> split CGST + SGST (50% each), IGST = 0.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # 1. Customer with gst_state = 'Odisha'
    cust_odisha = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Odisha Enterprise", "email": "odisha@gst.com", "gst_state": "Odisha"},
    ).json()

    # 2. 18% GST tax
    tax = client.post(
        "/api/taxes",
        headers=headers,
        json={"name": "GST 18%", "rate_percent": 18.0, "type": "gst"},
    ).json()

    # 3. Product at 1000.0
    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Cloud Server", "sales_price": 1000.0},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Monthly Server", "price": 1000.0, "billing_period": "monthly"},
    ).json()

    # 4. Create subscription with tax
    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust_odisha["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1, "tax_id": tax["id"]}],
        },
    ).json()

    # 5. Generate invoice
    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers).json()

    # Verify: Subtotal = 1000, Tax = 180 (18%), CGST = 90, SGST = 90, IGST = 0, Total = 1180
    assert inv["subtotal"] == 1000.0
    assert inv["tax_total"] == 180.0
    assert inv["cgst"] == 90.0
    assert inv["sgst"] == 90.0
    assert inv["igst"] == 0.0
    assert inv["total"] == 1180.0


def test_gst_split_interstate_igst(client, auth_tokens):
    """
    Step 13: GST Rule
    If customer gst_state != company state (e.g. Karnataka) -> IGST = 100%, CGST = 0, SGST = 0.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # 1. Customer with gst_state = 'Karnataka'
    cust_karnataka = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Bangalore Tech", "email": "bengaluru@gst.com", "gst_state": "Karnataka"},
    ).json()

    tax = client.post(
        "/api/taxes",
        headers=headers,
        json={"name": "GST 18% Interstate", "rate_percent": 18.0, "type": "gst"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Database Cluster", "sales_price": 1000.0},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Monthly DB", "price": 1000.0, "billing_period": "monthly"},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust_karnataka["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1, "tax_id": tax["id"]}],
        },
    ).json()

    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers).json()

    # Verify: Subtotal = 1000, Tax = 180 (18%), CGST = 0, SGST = 0, IGST = 180, Total = 1180
    assert inv["subtotal"] == 1000.0
    assert inv["tax_total"] == 180.0
    assert inv["cgst"] == 0.0
    assert inv["sgst"] == 0.0
    assert inv["igst"] == 180.0
    assert inv["total"] == 1180.0
