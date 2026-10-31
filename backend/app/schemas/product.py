from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ProductVariantBase(BaseModel):
    attribute: str
    value: str
    extra_price: float = 0.0


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantUpdate(BaseModel):
    attribute: Optional[str] = None
    value: Optional[str] = None
    extra_price: Optional[float] = None


class ProductVariantOut(ProductVariantBase):
    id: int
    product_id: int

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    name: str
    type: str = "service"
    sales_price: float = 0.0
    cost_price: float = 0.0
    notes: Optional[str] = None


class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantCreate]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    sales_price: Optional[float] = None
    cost_price: Optional[float] = None
    notes: Optional[str] = None


class ProductOut(ProductBase):
    id: int
    variants: List[ProductVariantOut] = []

    model_config = ConfigDict(from_attributes=True)
