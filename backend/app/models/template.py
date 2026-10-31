from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class QuotationTemplate(Base):
    """
    Table: quotation_templates (id, name, validity_days, plan_id)
    """
    __tablename__ = "quotation_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    validity_days = Column(Integer, nullable=False, default=30)
    plan_id = Column(Integer, ForeignKey("recurring_plans.id", ondelete="SET NULL"), nullable=True)

    plan = relationship("RecurringPlan", foreign_keys=[plan_id])
    lines = relationship("TemplateLine", back_populates="template", cascade="all, delete-orphan")


class TemplateLine(Base):
    """
    Table: template_lines (id, template_id, product_id, variant_id, qty)
    """
    __tablename__ = "template_lines"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("quotation_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    qty = Column(Integer, nullable=False, default=1)

    template = relationship("QuotationTemplate", back_populates="lines")
    product = relationship("Product", foreign_keys=[product_id])
    variant = relationship("ProductVariant", foreign_keys=[variant_id])
