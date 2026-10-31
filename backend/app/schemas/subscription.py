from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.contact import ContactOut
from backend.app.schemas.plan import PlanOut
from backend.app.schemas.product import ProductOut, ProductVariantOut
from backend.app.schemas.tax import TaxOut
from backend.app.schemas.discount import DiscountOut


class SubscriptionLineBase(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    qty: int = 1
    unit_price: Optional[float] = None
    tax_id: Optional[int] = None
    discount_id: Optional[int] = None


class SubscriptionLineCreate(SubscriptionLineBase):
    pass


class SubscriptionLineOut(SubscriptionLineBase):
    id: int
    subscription_id: int
    amount: float
    product: Optional[ProductOut] = None
    variant: Optional[ProductVariantOut] = None
    tax: Optional[TaxOut] = None
    discount: Optional[DiscountOut] = None

    model_config = ConfigDict(from_attributes=True)


class SubscriptionBase(BaseModel):
    customer_id: int
    plan_id: int
    start_date: Optional[date] = None
    expiry_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    payment_terms: Optional[str] = "Immediate"
    status: Optional[str] = "draft"


class SubscriptionCreate(SubscriptionBase):
    lines: Optional[List[SubscriptionLineCreate]] = None


class SubscriptionFromTemplate(BaseModel):
    customer_id: int
    start_date: Optional[date] = None
    payment_terms: Optional[str] = "Immediate"


class SubscriptionStatusUpdate(BaseModel):
    status: str


class SubscriptionUpdate(BaseModel):
    customer_id: Optional[int] = None
    plan_id: Optional[int] = None
    start_date: Optional[date] = None
    expiry_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    payment_terms: Optional[str] = None
    status: Optional[str] = None


class SubscriptionOut(BaseModel):
    id: int
    number: str
    customer_id: int
    plan_id: int
    start_date: date
    expiry_date: Optional[date] = None
    next_billing_date: date
    payment_terms: Optional[str] = None
    status: str
    created_by: Optional[int] = None
    created_at: datetime
    total_amount: float = 0.0

    customer: Optional[ContactOut] = None
    plan: Optional[PlanOut] = None
    lines: List[SubscriptionLineOut] = []

    model_config = ConfigDict(from_attributes=True)
