import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, Date
from backend.app.core.database import Base


class BillingPeriod(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class RecurringPlan(Base):
    """
    Table: recurring_plans (id, name, price, billing_period daily/weekly/monthly/yearly,
    min_qty, start_date, end_date, auto_close, closable, pausable, renewable)
    """
    __tablename__ = "recurring_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    price = Column(Float, nullable=False, default=0.0)
    billing_period = Column(String(50), nullable=False, default=BillingPeriod.MONTHLY.value)
    min_qty = Column(Integer, nullable=False, default=1)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    auto_close = Column(Boolean, nullable=False, default=False)
    closable = Column(Boolean, nullable=False, default=True)
    pausable = Column(Boolean, nullable=False, default=True)
    renewable = Column(Boolean, nullable=False, default=True)
