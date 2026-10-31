from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PlanBase(BaseModel):
    name: str
    price: float = 0.0
    billing_period: str = "monthly"  # daily, weekly, monthly, yearly
    min_qty: int = 1
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    auto_close: bool = False
    closable: bool = True
    pausable: bool = True
    renewable: bool = True


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    billing_period: Optional[str] = None
    min_qty: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    auto_close: Optional[bool] = None
    closable: Optional[bool] = None
    pausable: Optional[bool] = None
    renewable: Optional[bool] = None


class PlanOut(PlanBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
