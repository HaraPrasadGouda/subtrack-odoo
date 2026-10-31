from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.analytics import RevenueAnalyticsOut
from backend.app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Revenue Analytics"])


@router.get("", response_model=RevenueAnalyticsOut)
def get_revenue_analytics(
    target_date: Optional[date] = Query(None, description="Simulate analytics as of specific date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """
    Get executive revenue and subscriber analytics:
    - MRR (Monthly Recurring Revenue) with period normalizations:
      yearly/12, weekly*4.33, daily*30, monthly
    - ARR (Annual Recurring Revenue = MRR * 12)
    - Churn percentage this month
    - Expected revenue for the next 30 days
    - Monthly revenue series for the last 6 months
    """
    return AnalyticsService.get_revenue_analytics(db, target_date=target_date)

