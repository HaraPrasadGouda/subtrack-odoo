from typing import Optional
from pydantic import BaseModel, ConfigDict


class TaxBase(BaseModel):
    name: str
    rate_percent: float = 0.0
    type: str = "gst"  # gst, other


class TaxCreate(TaxBase):
    pass


class TaxUpdate(BaseModel):
    name: Optional[str] = None
    rate_percent: Optional[float] = None
    type: Optional[str] = None


class TaxOut(TaxBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
