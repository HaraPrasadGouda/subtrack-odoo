from typing import Optional
from pydantic import BaseModel, Field


class PortalPaymentRequest(BaseModel):
    method: str = Field(default="card", description="Payment method: upi, card, bank, cash")
    amount: Optional[float] = Field(default=None, gt=0, description="Payment amount. If omitted, full balance is paid.")
    note: Optional[str] = "Portal payment"
