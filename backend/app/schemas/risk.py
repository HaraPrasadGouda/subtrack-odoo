from typing import List
from pydantic import BaseModel, ConfigDict


class CustomerRiskOut(BaseModel):
    customer_id: int
    customer_name: str
    risk_level: str  # High, Medium, Low
    risk_score: int  # 0 to 100
    reasons: List[str]
    overdue_invoices_count: int
    paused_subscriptions_count: int
    expiring_subscriptions_count: int
    late_payments_count: int

    model_config = ConfigDict(from_attributes=True)
