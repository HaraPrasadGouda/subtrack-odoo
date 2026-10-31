from typing import List
from pydantic import BaseModel, ConfigDict


class MonthlyRevenueItem(BaseModel):
    month: str        # e.g. "2026-10"
    month_name: str   # e.g. "Oct 2026"
    revenue: float
    payments_count: int


class RevenueAnalyticsOut(BaseModel):
    mrr: float
    arr: float
    churn_rate_percent: float
    expected_revenue_30d: float
    monthly_revenue_last_6_months: List[MonthlyRevenueItem]
    active_subscriptions_count: int
    total_subscriptions_count: int

    model_config = ConfigDict(from_attributes=True)

