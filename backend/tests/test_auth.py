from backend.app.models.user import User


def test_seed_admin_login(client):
    """Test seed admin credentials work and return admin role token."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@brightloop.com", "password": "Admin@1234"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@brightloop.com"
    assert data["user"]["role"] == "admin"


def test_password_policy_validation(client):
    """
    Test password policy: >8 chars + uppercase + lowercase + special char,
    else 400 with clear message.
    """
    # 1. Length <= 8
    res = client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@test.com", "password": "Abc!123"},  # 7 chars
    )
    assert res.status_code == 400
    assert "more than 8 characters" in res.json()["detail"]

    # Exactly 8 chars (must be >8)
    res = client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@test.com", "password": "Abcdefg!"},  # 8 chars
    )
    assert res.status_code == 400
    assert "more than 8 characters" in res.json()["detail"]

    # 2. No uppercase
    res = client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@test.com", "password": "abcdefgh!1"},
    )
    assert res.status_code == 400
    assert "uppercase letter" in res.json()["detail"]

    # 3. No lowercase
    res = client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@test.com", "password": "ABCDEFGH!1"},
    )
    assert res.status_code == 400
    assert "lowercase letter" in res.json()["detail"]

    # 4. No special char
    res = client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@test.com", "password": "Abcdefgh1"},
    )
    assert res.status_code == 400
    assert "special character" in res.json()["detail"]

    # 5. Valid password (>8 chars, has uppercase, lowercase, special char)
    res = client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@test.com", "password": "Password@123"},
    )
    assert res.status_code == 201
    assert res.json()["email"] == "alice@test.com"
    assert res.json()["role"] == "portal"


def test_signup_email_unique(client):
    """Test signup requires unique email."""
    # First signup
    res1 = client.post(
        "/api/auth/signup",
        json={"name": "Bob", "email": "bob@test.com", "password": "Password@123"},
    )
    assert res1.status_code == 201

    # Second signup with same email
    res2 = client.post(
        "/api/auth/signup",
        json={"name": "Bob Duplicate", "email": "bob@test.com", "password": "Password@123"},
    )
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"]


def test_login_and_me_endpoint(client):
    """Test login and accessing /api/auth/me with JWT."""
    # Register user
    signup_res = client.post(
        "/api/auth/signup",
        json={"name": "Charlie", "email": "charlie@test.com", "password": "Password@123"},
    )
    assert signup_res.status_code == 201

    # Login
    login_res = client.post(
        "/api/auth/login",
        json={"email": "charlie@test.com", "password": "Password@123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Access /api/auth/me without token -> 401 or 403
    me_unauth = client.get("/api/auth/me")
    assert me_unauth.status_code in (401, 403)

    # Access /api/auth/me with valid Bearer token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["email"] == "charlie@test.com"
    assert data["name"] == "Charlie"
    assert data["role"] == "portal"


def test_forgot_and_reset_password(client, db_session):
    """Test forgot-password generates reset token and reset-password updates password."""
    # Register user
    client.post(
        "/api/auth/signup",
        json={"name": "David", "email": "david@test.com", "password": "OldPassword@123"},
    )

    # Trigger forgot-password
    forgot_res = client.post(
        "/api/auth/forgot-password",
        json={"email": "david@test.com"},
    )
    assert forgot_res.status_code == 200
    assert "password reset instructions" in forgot_res.json()["message"]

    # Retrieve reset token from database
    user = db_session.query(User).filter(User.email == "david@test.com").first()
    assert user.reset_token is not None

    # Reset password with weak new password -> 400
    weak_reset_res = client.post(
        "/api/auth/reset-password",
        json={"token": user.reset_token, "new_password": "weak"},
    )
    assert weak_reset_res.status_code == 400

    # Reset password with strong new password
    reset_res = client.post(
        "/api/auth/reset-password",
        json={"token": user.reset_token, "new_password": "NewPassword@999"},
    )
    assert reset_res.status_code == 200

    # Verify old password no longer works
    old_login = client.post(
        "/api/auth/login",
        json={"email": "david@test.com", "password": "OldPassword@123"},
    )
    assert old_login.status_code == 401

    # Verify new password works
    new_login = client.post(
        "/api/auth/login",
        json={"email": "david@test.com", "password": "NewPassword@999"},
    )
    assert new_login.status_code == 200


def test_role_guards_and_admin_user_creation(client):
    """
    Test role guards:
    Only admin can create internal users (POST /api/users).
    Portal users and non-authenticated users get 403/401.
    """
    # 1. Login as admin
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@brightloop.com", "password": "Admin@1234"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    # 2. Admin creates an internal user
    create_res = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Internal Operator",
            "email": "staff@brightloop.com",
            "password": "StaffPassword@123",
            "role": "internal",
        },
    )
    assert create_res.status_code == 201
    internal_data = create_res.json()
    assert internal_data["role"] == "internal"
    assert internal_data["email"] == "staff@brightloop.com"

    # 3. Internal user logs in
    staff_login = client.post(
        "/api/auth/login",
        json={"email": "staff@brightloop.com", "password": "StaffPassword@123"},
    )
    assert staff_login.status_code == 200
    staff_token = staff_login.json()["access_token"]

    # 4. Internal user tries to create another user -> 403 Forbidden
    unauthorized_res = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={
            "name": "Another Staff",
            "email": "staff2@brightloop.com",
            "password": "StaffPassword@123",
            "role": "internal",
        },
    )
    assert unauthorized_res.status_code == 403
    assert "Access denied" in unauthorized_res.json()["detail"]

    # 5. Portal user tries to create a user -> 403 Forbidden
    client.post(
        "/api/auth/signup",
        json={"name": "Customer Eva", "email": "eva@test.com", "password": "EvaPassword@123"},
    )
    eva_login = client.post(
        "/api/auth/login",
        json={"email": "eva@test.com", "password": "EvaPassword@123"},
    )
    eva_token = eva_login.json()["access_token"]

    portal_create_res = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {eva_token}"},
        json={
            "name": "Hacker",
            "email": "hacker@test.com",
            "password": "HackerPassword@123",
            "role": "admin",
        },
    )
    assert portal_create_res.status_code == 403

