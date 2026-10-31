from datetime import date, timedelta
import pytest
from backend.app.models.subscription import Subscription
from backend.tests.test_crud import auth_tokens


def test_invoice_generation_and_double_billing_blocked(client, auth_tokens, db_session):
    """
    Test POST /api/subscriptions/{id}/invoice:
    - calculates subtotal, discounts, taxes
    - increments discount used_count
    - advances next_billing_date
    - blocks double billing for same period (returns 400)
    - stops discount when usage limit is exhausted
    """
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # Setup Customer (Odisha)
    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Odisha Corp", "email": "odisha@corp.com", "gst_state": "Odisha"},
    ).json()

    # Setup Plan (Monthly)
    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Cloud Monthly", "price": 1000.0, "billing_period": "monthly"},
    ).json()

    # Setup Product
    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Server Node", "sales_price": 500.0},
    ).json()

    # Setup Tax (18% GST)
    tax = client.post(
        "/api/taxes",
        headers=admin_headers,
        json={"name": "GST 18%", "rate_percent": 18.0, "type": "gst"},
    ).json()

    # Setup Discount (10% with limit=2)
    disc = client.post(
        "/api/discounts",
        headers=admin_headers,
        json={
            "name": "SAVE10",
            "type": "percent",
            "value": 10.0,
            "usage_limit": 2,
            "applies_to": "subscription",
        },
    ).json()
    assert disc["used_count"] == 0

    # Create Subscription with 2 nodes:
    # subtotal = 2 * 500 = 1000.
    # discount = 10% of 1000 = 100. discounted = 900.
    # tax = 18% of 900 = 162.
    # total = 1062.
    # Customer is in Odisha -> CGST = 81.0, SGST = 81.0, IGST = 0.0.
    today = date.today()
    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": str(today),
            "next_billing_date": str(today),
            "status": "active",
            "lines": [
                {
                    "product_id": prod["id"],
                    "qty": 2,
                    "tax_id": tax["id"],
                    "discount_id": disc["id"],
                }
            ],
        },
    ).json()
    sub_id = sub["id"]

    # 1. Generate First Invoice (Period 1: starts today)
    inv_res = client.post(f"/api/subscriptions/{sub_id}/invoice", headers=headers)
    assert inv_res.status_code == 201, inv_res.text
    inv = inv_res.json()
    assert inv["number"] == "INV-0001"
    assert inv["subtotal"] == 1000.0
    assert inv["discount_total"] == 100.0
    assert inv["tax_total"] == 162.0
    assert inv["total"] == 1062.0
    assert inv["cgst"] == 81.0
    assert inv["sgst"] == 81.0
    assert inv["igst"] == 0.0
    assert inv["status"] == "draft"

    # 2. Check discount usage_count incremented
    disc_refreshed = client.get(f"/api/discounts/{disc['id']}", headers=admin_headers).json()
    assert disc_refreshed["used_count"] == 1

    # 3. Check subscription next_billing_date was advanced by 30 days
    sub_refreshed = client.get(f"/api/subscriptions/{sub_id}", headers=headers).json()
    expected_next = today + timedelta(days=30)
    assert sub_refreshed["next_billing_date"] == str(expected_next)

    # 4. Attempting to bill the same period (today) again is BLOCKED with 400
    # Simulate setting next_billing_date back to today
    sub_model = db_session.query(Subscription).filter(Subscription.id == sub_id).first()
    sub_model.next_billing_date = today
    db_session.commit()

    dup_res = client.post(f"/api/subscriptions/{sub_id}/invoice", headers=headers)
    assert dup_res.status_code == 400
    assert "already has an invoice" in dup_res.json()["detail"]

    # Restore next_billing_date to expected_next
    sub_model.next_billing_date = expected_next
    db_session.commit()

    # 5. Bill second period (expected_next) -> INV-0002, discount usage count becomes 2
    inv2_res = client.post(f"/api/subscriptions/{sub_id}/invoice", headers=headers)
    assert inv2_res.status_code == 201
    assert inv2_res.json()["number"] == "INV-0002"

    disc_after_2 = client.get(f"/api/discounts/{disc['id']}", headers=admin_headers).json()
    assert disc_after_2["used_count"] == 2

    # 6. Bill third period -> discount usage limit was 2, now exhausted, discount_total must be 0
    inv3_res = client.post(f"/api/subscriptions/{sub_id}/invoice", headers=headers)
    assert inv3_res.status_code == 201
    inv3 = inv3_res.json()
    assert inv3["number"] == "INV-0003"
    assert inv3["discount_total"] == 0.0  # Discount stopped when exhausted


def test_gst_split_inter_state(client, auth_tokens):
    """
    Test GST split when customer is outside Odisha (IGST applied, CGST=SGST=0).
    """
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # Customer in Karnataka
    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Bengaluru Tech", "email": "bangalore@tech.com", "gst_state": "Karnataka"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Interstate Plan", "price": 500.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "License Seat", "sales_price": 1000.0},
    ).json()

    tax = client.post(
        "/api/taxes",
        headers=admin_headers,
        json={"name": "GST 18%", "rate_percent": 18.0, "type": "gst"},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1, "tax_id": tax["id"]}],
        },
    ).json()

    inv_res = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers)
    assert inv_res.status_code == 201
    inv = inv_res.json()
    assert inv["tax_total"] == 180.0
    assert inv["cgst"] == 0.0
    assert inv["sgst"] == 0.0
    assert inv["igst"] == 180.0  # Entire tax is IGST


def test_automated_billing_run(client, auth_tokens, db_session):
    """
    Test POST /api/billing/run:
    - Bills all active subscriptions where next_billing_date <= today
    - Advances next_billing_date
    - Never bills twice (returns created and skipped counts)
    """
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Batch Customer", "email": "batch@customer.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Monthly Plan", "price": 50.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "API Call Pack", "sales_price": 50.0},
    ).json()

    today = date.today()

    # 1. Create active sub due for billing
    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "start_date": str(today),
            "next_billing_date": str(today),
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # 2. Run billing: creates invoice and advances next_billing_date
    run1 = client.post("/api/billing/run", headers=headers).json()
    assert run1["created_count"] >= 1
    assert any(i["subscription_id"] == sub["id"] for i in run1["invoices"])

    # 3. Running billing again immediately finds sub.next_billing_date > today (in future),
    # so created_count for this sub is 0
    run2 = client.post("/api/billing/run", headers=headers).json()
    assert not any(i["subscription_id"] == sub["id"] for i in run2["invoices"])

    # 4. If next_billing_date is reset to today (where invoice already exists),
    # run_billing skips it and increments skipped_count!
    sub_model = db_session.query(Subscription).filter(Subscription.id == sub["id"]).first()
    sub_model.next_billing_date = today
    db_session.commit()

    run3 = client.post("/api/billing/run", headers=headers).json()
    assert run3["skipped_count"] >= 1
    assert not any(i["subscription_id"] == sub["id"] for i in run3["invoices"])


def test_invoice_status_flow_and_send(client, auth_tokens):
    """Test invoice status flow (draft -> confirmed -> cancelled) and send email."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Flow Customer", "email": "flow@customer.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Monthly", "price": 100.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Item", "sales_price": 100.0},
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
    assert inv["status"] == "draft"

    # Confirm
    confirm_res = client.post(f"/api/invoices/{inv_id}/confirm", headers=headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "confirmed"

    # Send (logs to console)
    send_res = client.post(f"/api/invoices/{inv_id}/send", headers=headers)
    assert send_res.status_code == 200
    assert "sent successfully" in send_res.json()["message"]

    # Cancel
    cancel_res = client.post(f"/api/invoices/{inv_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"


def test_invoice_pdf_download(client, auth_tokens):
    """Test GET /api/invoices/{id}/pdf generates a valid PDF."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "PDF Corp", "email": "pdf@corp.com", "gst_state": "Odisha"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "PDF Plan", "price": 200.0, "billing_period": "monthly"},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "ReportLab Item", "sales_price": 250.0},
    ).json()

    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "active",
            "lines": [{"product_id": prod["id"], "qty": 2}],
        },
    ).json()

    inv = client.post(f"/api/subscriptions/{sub['id']}/invoice", headers=headers).json()

    pdf_res = client.get(f"/api/invoices/{inv['id']}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    # PDF files start with %PDF
    assert pdf_res.content.startswith(b"%PDF")
    assert len(pdf_res.content) > 1000
