import pytest
from backend.tests.test_crud import auth_tokens


def test_activity_timeline_status_and_price_changes(client, auth_tokens):
    """
    Test Step 12: Activity Timeline
    Every status/price change writes activity_log; GET /api/subscriptions/{id}/timeline.
    """
    headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}

    # 1. Setup Customer, Plan, Product
    cust = client.post(
        "/api/customers",
        headers=headers,
        json={"name": "Timeline Cust", "email": "timeline_step12@test.com"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Timeline Plan", "price": 400.0, "billing_period": "monthly", "pausable": True, "renewable": True, "closable": True},
    ).json()

    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Timeline Feature", "sales_price": 400.0},
    ).json()

    # 2. Create subscription -> should log 'created'
    sub = client.post(
        "/api/subscriptions",
        headers=headers,
        json={
            "customer_id": cust["id"],
            "plan_id": plan["id"],
            "status": "draft",
            "lines": [{"product_id": prod["id"], "qty": 1}],
        },
    ).json()

    # 3. Status change: draft -> quotation
    client.post(f"/api/subscriptions/{sub['id']}/status", headers=headers, json={"status": "quotation"})

    # 4. Status change: quotation -> confirmed -> active
    client.post(f"/api/subscriptions/{sub['id']}/status", headers=headers, json={"status": "confirmed"})
    client.post(f"/api/subscriptions/{sub['id']}/status", headers=headers, json={"status": "active"})

    # 5. Price change on subscription line
    line_id = sub["lines"][0]["id"]
    price_res = client.put(
        f"/api/subscriptions/{sub['id']}/lines/{line_id}",
        headers=headers,
        json={"unit_price": 450.0, "qty": 2},
    )
    assert price_res.status_code == 200, price_res.text
    updated_sub = price_res.json()
    assert updated_sub["lines"][0]["unit_price"] == 450.0
    assert updated_sub["lines"][0]["qty"] == 2
    assert updated_sub["lines"][0]["amount"] == 900.0

    # 6. Pause subscription -> should log 'paused'
    client.post(f"/api/subscriptions/{sub['id']}/pause", headers=headers)

    # 7. Fetch timeline
    timeline_res = client.get(f"/api/subscriptions/{sub['id']}/timeline", headers=headers)
    assert timeline_res.status_code == 200, timeline_res.text
    timeline = timeline_res.json()

    # Verify actions in timeline
    actions = [entry["action"] for entry in timeline]
    assert "created" in actions
    assert "status_change" in actions
    assert "price_change" in actions

    # Verify pause was logged in timeline as status transition
    pause_entry = next(entry for entry in timeline if entry["new_value"] == "paused")
    assert pause_entry["old_value"] == "active"
    assert pause_entry["action"] == "status_change"

    # Verify price change log contents
    price_entry = next(entry for entry in timeline if entry["action"] == "price_change")
    assert "450" in price_entry["new_value"]
    assert price_entry["old_value"] is not None
