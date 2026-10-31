from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class ActivityLog(Base):
    """
    Table: activity_log (id, entity_type, entity_id, action, old_value, new_value, user_id, created_at)
    """
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # e.g. "subscription", "invoice"
    entity_id = Column(Integer, nullable=False, index=True)
    action = Column(String(100), nullable=False)                 # e.g. "status_change", "created"
    old_value = Column(String(500), nullable=True)
    new_value = Column(String(500), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", foreign_keys=[user_id])
