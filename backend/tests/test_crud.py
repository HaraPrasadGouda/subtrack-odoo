import pytest


@pytest.fixture
def auth_tokens(client):
    """Setup admin, internal, and portal users with auth tokens."""
    # 1. Admin token (from seeded admin)
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@brightloop.com", "password": "Admin@1234"},
    )
    admin_token = admin_login.json()["access_token"]

    # 2. Internal user
    client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Staff Member",
            "email": "staff@brightloop.com",
            "password": "StaffPassword@123",
            "role": "internal",
        },
    )
    staff_login = client.post(
        "/api/auth/login",
        json={"email": "staff@brightloop.com", "password": "StaffPassword@123"},
    )
    internal_token = staff_login.json()["access_token"]

    # 3. Portal user
    client.post(
        "/api/auth/signup",
        json={
            "name": "Portal Customer",
            "email": "portal@customer.com",
            "password": "CustomerPassword@123",
        },
    )
    portal_login = client.post(
        "/api/auth/login",
        json={"email": "portal@customer.com", "password": "CustomerPassword@123"},
    )
    portal_token = portal_login.json()["access_token"]

    return {
        "admin": admin_token,
        "internal": internal_token,
        "portal": portal_token,
    }


def test_products_and_variants_crud(client, auth_tokens):
    """Test full CRUD on products and variants."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    # 1. Create product with initial variant
    prod_data = {
        "name": "SubTrack ERP Cloud",
        "type": "service",
        "sales_price": 1000.0,
        "cost_price": 400.0,
        "notes": "Flagship SaaS license",
        "variants": [
            {"attribute": "Brand", "value": "Odoo", "extra_price": 560.0}
        ],
    }
    create_res = client.post("/api/products", headers=headers, json=prod_data)
    assert create_res.status_code == 201, create_res.text
    prod = create_res.json()
    assert prod["name"] == "SubTrack ERP Cloud"
    assert len(prod["variants"]) == 1
    variant_id = prod["variants"][0]["id"]
    prod_id = prod["id"]

    # 2. Get product
    get_res = client.get(f"/api/products/{prod_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["sales_price"] == 1000.0

    # 3. Add second variant
    add_var_res = client.post(
        f"/api/products/{prod_id}/variants",
        headers=headers,
        json={"attribute": "Edition", "value": "Enterprise", "extra_price": 800.0},
    )
    assert add_var_res.status_code == 201
    var2_id = add_var_res.json()["id"]

    # 4. Update variant
    upd_var_res = client.put(
        f"/api/products/{prod_id}/variants/{var2_id}",
        headers=headers,
        json={"extra_price": 950.0},
    )
    assert upd_var_res.status_code == 200
    assert upd_var_res.json()["extra_price"] == 950.0

    # 5. Delete variant
    del_var_res = client.delete(f"/api/products/{prod_id}/variants/{variant_id}", headers=headers)
    assert del_var_res.status_code == 200

    # Verify only 1 variant remains
    refreshed_prod = client.get(f"/api/products/{prod_id}", headers=headers).json()
    assert len(refreshed_prod["variants"]) == 1

    # 6. Delete product
    del_res = client.delete(f"/api/products/{prod_id}", headers=headers)
    assert del_res.status_code == 200


def test_plans_crud(client, auth_tokens):
    """Test recurring plans CRUD."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    # 1. Create plan
    plan_data = {
        "name": "Standard Monthly",
        "price": 2999.0,
        "billing_period": "monthly",
        "min_qty": 1,
        "auto_close": False,
        "closable": True,
        "pausable": True,
        "renewable": True,
    }
    create_res = client.post("/api/plans", headers=headers, json=plan_data)
    assert create_res.status_code == 201
    plan_id = create_res.json()["id"]

    # 2. List plans
    list_res = client.get("/api/plans", headers=headers)
    assert list_res.status_code == 200
    assert any(p["id"] == plan_id for p in list_res.json())

    # 3. Update plan
    upd_res = client.put(
        f"/api/plans/{plan_id}",
        headers=headers,
        json={"price": 3499.0, "billing_period": "yearly"},
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["price"] == 3499.0
    assert upd_res.json()["billing_period"] == "yearly"

    # 4. Invalid billing period fails
    inv_res = client.put(
        f"/api/plans/{plan_id}",
        headers=headers,
        json={"billing_period": "biweekly"},
    )
    assert inv_res.status_code == 400

    # 5. Delete plan
    del_res = client.delete(f"/api/plans/{plan_id}", headers=headers)
    assert del_res.status_code == 200


def test_taxes_permissions_and_crud(client, auth_tokens):
    """
    Test taxes:
    - Internal can view taxes
    - Internal CANNOT edit taxes (403)
    - Admin can create, update, delete taxes
    """
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    internal_headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    # 1. Internal tries to create tax -> 403 Forbidden
    unauth_tax = client.post(
        "/api/taxes",
        headers=internal_headers,
        json={"name": "GST 18%", "rate_percent": 18.0, "type": "gst"},
    )
    assert unauth_tax.status_code == 403

    # 2. Admin creates tax -> 201 Created
    create_res = client.post(
        "/api/taxes",
        headers=admin_headers,
        json={"name": "GST 18%", "rate_percent": 18.0, "type": "gst"},
    )
    assert create_res.status_code == 201
    tax_id = create_res.json()["id"]

    # 3. Internal user CAN read the taxes
    read_res = client.get(f"/api/taxes/{tax_id}", headers=internal_headers)
    assert read_res.status_code == 200
    assert read_res.json()["rate_percent"] == 18.0

    # 4. Internal tries to delete tax -> 403 Forbidden
    del_unauth = client.delete(f"/api/taxes/{tax_id}", headers=internal_headers)
    assert del_unauth.status_code == 403

    # 5. Admin updates and deletes tax
    upd_res = client.put(f"/api/taxes/{tax_id}", headers=admin_headers, json={"rate_percent": 12.0})
    assert upd_res.status_code == 200
    assert upd_res.json()["rate_percent"] == 12.0

    del_res = client.delete(f"/api/taxes/{tax_id}", headers=admin_headers)
    assert del_res.status_code == 200


def test_discounts_admin_only(client, auth_tokens):
    """
    Test discounts:
    - /api/discounts is ADMIN ONLY
    - Internal and Portal are rejected with 403
    """
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    internal_headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}
    portal_headers = {"Authorization": f"Bearer {auth_tokens['portal']}"}

    disc_payload = {
        "name": "FESTIVE10",
        "type": "percent",
        "value": 10.0,
        "min_purchase": 500.0,
        "min_qty": 1,
        "usage_limit": 100,
        "applies_to": "subscription",
    }

    # 1. Portal fails -> 403
    assert client.get("/api/discounts", headers=portal_headers).status_code == 403
    assert client.post("/api/discounts", headers=portal_headers, json=disc_payload).status_code == 403

    # 2. Internal fails -> 403
    assert client.get("/api/discounts", headers=internal_headers).status_code == 403
    assert client.post("/api/discounts", headers=internal_headers, json=disc_payload).status_code == 403

    # 3. Admin succeeds
    create_res = client.post("/api/discounts", headers=admin_headers, json=disc_payload)
    assert create_res.status_code == 201
    disc_id = create_res.json()["id"]

    list_res = client.get("/api/discounts", headers=admin_headers)
    assert list_res.status_code == 200
    assert any(d["id"] == disc_id for d in list_res.json())

    del_res = client.delete(f"/api/discounts/{disc_id}", headers=admin_headers)
    assert del_res.status_code == 200


def test_quotation_templates_and_lines(client, auth_tokens):
    """Test quotation templates with template_lines."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}

    # Create product and plan first
    prod = client.post(
        "/api/products",
        headers=headers,
        json={"name": "Module A", "sales_price": 500.0, "type": "service"},
    ).json()

    plan = client.post(
        "/api/plans",
        headers=headers,
        json={"name": "Quarterly Plan", "price": 1500.0, "billing_period": "monthly"},
    ).json()

    # 1. Create quotation template with line
    template_data = {
        "name": "Standard Cloud Bundle",
        "validity_days": 15,
        "plan_id": plan["id"],
        "lines": [
            {"product_id": prod["id"], "qty": 2}
        ],
    }
    create_res = client.post("/api/templates", headers=headers, json=template_data)
    assert create_res.status_code == 201
    tpl = create_res.json()
    assert tpl["name"] == "Standard Cloud Bundle"
    assert len(tpl["lines"]) == 1
    tpl_id = tpl["id"]
    line_id = tpl["lines"][0]["id"]

    # 2. Add second line
    add_line_res = client.post(
        f"/api/templates/{tpl_id}/lines",
        headers=headers,
        json={"product_id": prod["id"], "qty": 3},
    )
    assert add_line_res.status_code == 201

    # 3. Delete first line
    del_line_res = client.delete(f"/api/templates/{tpl_id}/lines/{line_id}", headers=headers)
    assert del_line_res.status_code == 200

    # 4. Delete template
    del_tpl_res = client.delete(f"/api/templates/{tpl_id}", headers=headers)
    assert del_tpl_res.status_code == 200


def test_customers_crud(client, auth_tokens):
    """Test customer (contacts) CRUD and portal restrictions."""
    headers = {"Authorization": f"Bearer {auth_tokens['internal']}"}
    portal_headers = {"Authorization": f"Bearer {auth_tokens['portal']}"}

    # 1. Portal user cannot manage customers -> 403
    assert client.get("/api/customers", headers=portal_headers).status_code == 403
    assert client.post("/api/customers", headers=portal_headers, json={"name": "X", "email": "x@x.com"}).status_code == 403

    # 2. Create customer as internal
    cust_data = {
        "name": "Acme Tech Solutions",
        "email": "contact@acmetech.com",
        "phone": "+91-9876543210",
        "address": "Infocity, Bhubaneswar",
        "gst_state": "Odisha",
    }
    create_res = client.post("/api/customers", headers=headers, json=cust_data)
    assert create_res.status_code == 201
    cust_id = create_res.json()["id"]

    # 3. List customers & search
    search_res = client.get("/api/customers?search=Acme", headers=headers)
    assert search_res.status_code == 200
    assert len(search_res.json()) >= 1
    assert search_res.json()[0]["gst_state"] == "Odisha"

    # 4. Update customer
    upd_res = client.put(
        f"/api/customers/{cust_id}",
        headers=headers,
        json={"address": "Patia, Bhubaneswar"},
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["address"] == "Patia, Bhubaneswar"

    # 5. Delete customer
    del_res = client.delete(f"/api/customers/{cust_id}", headers=headers)
    assert del_res.status_code == 200
