from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Contact(Base):
    """
    Contacts represent Customers in SubTrack.
    Table: contacts (id, user_id, name, email, phone, address, gst_state)
    """
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    gst_state = Column(String(100), nullable=True)

    user = relationship("User", backref="contact", foreign_keys=[user_id])
