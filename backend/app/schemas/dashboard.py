from datetime import date
from typing import Dict, Optional
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    start_date: date
    end_date: date
    active_subscriptions: int
    total_subscriptions: int
    revenue_this_month: float
    payments_total: float
    payments_count: int
    outstanding_amount: float
    outstanding_count: int
    overdue_count: int
    overdue_amount: float
    overdue_amount_recovered: float = 0.0
    status_breakdown: Dict[str, int]

