from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum
from backend.app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    INTERNAL = "internal"
    PORTAL = "portal"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.PORTAL.value)
    reset_token = Column(String(255), nullable=True, index=True)
    reset_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
