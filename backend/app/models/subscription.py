from datetime import date, datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class SubscriptionStatus(str, enum.Enum):
    DRAFT = "draft"
    QUOTATION = "quotation"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"


class Subscription(Base):
    """
    Table: subscriptions (id, number UNIQUE, customer_id, plan_id, start_date, expiry_date,
    next_billing_date, payment_terms, status draft/quotation/confirmed/active/paused/closed, created_by)
    Indexes on status, customer_id, next_billing_date.
    """
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("recurring_plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    start_date = Column(Date, nullable=False, default=date.today)
    expiry_date = Column(Date, nullable=True)
    next_billing_date = Column(Date, nullable=False, index=True)
    payment_terms = Column(String(100), nullable=True, default="Immediate")
    status = Column(String(50), nullable=False, default=SubscriptionStatus.DRAFT.value, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    customer = relationship("Contact", foreign_keys=[customer_id])
    plan = relationship("RecurringPlan", foreign_keys=[plan_id])
    creator = relationship("User", foreign_keys=[created_by])
    lines = relationship("SubscriptionLine", back_populates="subscription", cascade="all, delete-orphan")


class SubscriptionLine(Base):
    """
    Table: subscription_lines (id, subscription_id, product_id, variant_id, qty, unit_price, tax_id, discount_id, amount)
    """
    __tablename__ = "subscription_lines"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    qty = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    tax_id = Column(Integer, ForeignKey("taxes.id", ondelete="SET NULL"), nullable=True)
    discount_id = Column(Integer, ForeignKey("discounts.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False, default=0.0)

    # Relationships
    subscription = relationship("Subscription", back_populates="lines")
    product = relationship("Product", foreign_keys=[product_id])
    variant = relationship("ProductVariant", foreign_keys=[variant_id])
    tax = relationship("Tax", foreign_keys=[tax_id])
    discount = relationship("Discount", foreign_keys=[discount_id])
