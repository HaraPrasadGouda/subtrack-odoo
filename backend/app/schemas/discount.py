from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DiscountBase(BaseModel):
    name: str
    type: str = "percent"  # fixed, percent
    value: float = 0.0
    min_purchase: float = 0.0
    min_qty: int = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    usage_limit: Optional[int] = None
    applies_to: str = "subscription"  # product, subscription
    product_id: Optional[int] = None


class DiscountCreate(DiscountBase):
    pass


class DiscountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    value: Optional[float] = None
    min_purchase: Optional[float] = None
    min_qty: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    usage_limit: Optional[int] = None
    used_count: Optional[int] = None
    applies_to: Optional[str] = None
    product_id: Optional[int] = None


class DiscountOut(DiscountBase):
    id: int
    used_count: int = 0

    model_config = ConfigDict(from_attributes=True)
