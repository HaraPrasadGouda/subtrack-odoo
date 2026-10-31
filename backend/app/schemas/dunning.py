from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ReminderOut(BaseModel):
    id: int
    invoice_id: int
    invoice_number: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    day_offset: int  # 1, 3, 7
    sent_at: datetime
    channel: str
    amount_due: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class DunningRunOut(BaseModel):
    check_date: date
    invoices_checked: int
    reminders_created: int
    reminders: List[ReminderOut]


class DunningStatsOut(BaseModel):
    total_reminders_sent: int
    invoices_reminded_count: int
    overdue_amount_recovered: float
