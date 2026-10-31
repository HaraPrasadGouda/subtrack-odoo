import enum
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class DiscountType(str, enum.Enum):
    FIXED = "fixed"
    PERCENT = "percent"


class DiscountAppliesTo(str, enum.Enum):
    PRODUCT = "product"
    SUBSCRIPTION = "subscription"


class Discount(Base):
    """
    Table: discounts (id, name, type fixed/percent, value, min_purchase, min_qty,
    start_date, end_date, usage_limit, used_count, applies_to product/subscription, product_id nullable)
    """
    __tablename__ = "discounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False, default=DiscountType.PERCENT.value)
    value = Column(Float, nullable=False, default=0.0)
    min_purchase = Column(Float, nullable=False, default=0.0)
    min_qty = Column(Integer, nullable=False, default=0)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    usage_limit = Column(Integer, nullable=True)  # None = unlimited
    used_count = Column(Integer, nullable=False, default=0)
    applies_to = Column(String(50), nullable=False, default=DiscountAppliesTo.SUBSCRIPTION.value)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    product = relationship("Product", foreign_keys=[product_id])
