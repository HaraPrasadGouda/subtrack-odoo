from datetime import date, datetime, timezone
import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    PAID = "paid"
    CANCELLED = "cancelled"


class Invoice(Base):
    """
    Table: invoices (id, number UNIQUE, subscription_id, customer_id, invoice_date, due_date,
    period_start, period_end, subtotal, discount_total, tax_total, cgst, sgst, igst, total,
    amount_paid, status draft/confirmed/paid/cancelled) UNIQUE(subscription_id, period_start)
    Indexes on status, customer_id, due_date.
    """
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), unique=True, index=True, nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=False, index=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    subtotal = Column(Float, nullable=False, default=0.0)
    discount_total = Column(Float, nullable=False, default=0.0)
    tax_total = Column(Float, nullable=False, default=0.0)
    cgst = Column(Float, nullable=False, default=0.0)
    sgst = Column(Float, nullable=False, default=0.0)
    igst = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)
    amount_paid = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), nullable=False, default=InvoiceStatus.DRAFT.value, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("subscription_id", "period_start", name="uq_invoice_sub_period_start"),
    )

    # Relationships
    subscription = relationship("Subscription", foreign_keys=[subscription_id])
    customer = relationship("Contact", foreign_keys=[customer_id])
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    """
    Table: invoice_lines (id, invoice_id, product_id, description, qty, unit_price, discount_amount, tax_amount, amount)
    """
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    description = Column(String(500), nullable=False)
    qty = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    amount = Column(Float, nullable=False, default=0.0)

    # Relationships
    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product", foreign_keys=[product_id])


class Payment(Base):
    """
    Table: payments (id, invoice_id, method upi/card/bank/cash, amount, date, note)
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    method = Column(String(50), nullable=False, default="bank")  # upi, card, bank, cash
    amount = Column(Float, nullable=False, default=0.0)
    date = Column(Date, nullable=False, default=date.today)
    note = Column(String(500), nullable=True)

    invoice = relationship("Invoice", back_populates="payments")


class Reminder(Base):
    """
    Table: reminders (id, invoice_id, day_offset 1/3/7, sent_at, channel)
    """
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    day_offset = Column(Integer, nullable=False)  # 1, 3, 7
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    channel = Column(String(50), nullable=False, default="email")

    invoice = relationship("Invoice", foreign_keys=[invoice_id])

