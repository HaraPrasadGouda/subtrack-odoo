import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.core.database import Base, get_db
from backend.app.core.security import get_password_hash
from backend.app.core.config import settings
from backend.app.models.user import User, UserRole
from backend.app.main import app

# Test SQLite in-memory engine with StaticPool
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Creates a fresh database schema for every test function."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()

    # Seed the admin user into test db
    admin_user = User(
        name=settings.ADMIN_NAME,
        email=settings.ADMIN_EMAIL.lower(),
        password_hash=get_password_hash(settings.ADMIN_PASSWORD),
        role=UserRole.ADMIN.value,
    )
    session.add(admin_user)
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Dependency override for test client."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

