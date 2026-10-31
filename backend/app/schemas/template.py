from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.product import ProductOut, ProductVariantOut
from backend.app.schemas.plan import PlanOut


class TemplateLineBase(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    qty: int = 1


class TemplateLineCreate(TemplateLineBase):
    pass


class TemplateLineOut(TemplateLineBase):
    id: int
    template_id: int
    product: Optional[ProductOut] = None
    variant: Optional[ProductVariantOut] = None

    model_config = ConfigDict(from_attributes=True)


class QuotationTemplateBase(BaseModel):
    name: str
    validity_days: int = 30
    plan_id: Optional[int] = None


class QuotationTemplateCreate(QuotationTemplateBase):
    lines: Optional[List[TemplateLineCreate]] = None


class QuotationTemplateUpdate(BaseModel):
    name: Optional[str] = None
    validity_days: Optional[int] = None
    plan_id: Optional[int] = None


class QuotationTemplateOut(QuotationTemplateBase):
    id: int
    plan: Optional[PlanOut] = None
    lines: List[TemplateLineOut] = []

    model_config = ConfigDict(from_attributes=True)
