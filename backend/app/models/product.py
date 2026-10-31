from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Product(Base):
    """
    Table: products (id, name, type, sales_price, cost_price, notes)
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(50), nullable=False, default="service")  # service, storable, consumable
    sales_price = Column(Float, nullable=False, default=0.0)
    cost_price = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base):
    """
    Table: product_variants (id, product_id, attribute, value, extra_price)
    e.g. Brand=Odoo +560
    """
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    attribute = Column(String(100), nullable=False)  # e.g. "Brand", "Edition"
    value = Column(String(100), nullable=False)      # e.g. "Odoo", "Enterprise"
    extra_price = Column(Float, nullable=False, default=0.0)

    product = relationship("Product", back_populates="variants")
