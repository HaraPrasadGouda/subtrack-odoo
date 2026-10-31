from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.dashboard import DashboardSummary
from backend.app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    start_date: Optional[date] = Query(None, description="Start date for revenue/payments calculation"),
    end_date: Optional[date] = Query(None, description="End date for revenue/payments calculation"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """
    Get dashboard summary metrics:
    - Active subscriptions count
    - Total subscriptions & breakdown by status
    - Revenue / payments in date range
    - Outstanding invoices count & amount
    - Overdue invoices count & amount
    """
    return DashboardService.get_summary(db, start_date=start_date, end_date=end_date)

