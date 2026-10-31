from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.dunning import DunningRunOut, ReminderOut, DunningStatsOut
from backend.app.services.dunning_service import DunningService

router = APIRouter(prefix="/dunning", tags=["Smart Dunning"])


@router.post("/run", response_model=DunningRunOut)
def run_dunning(
    target_date: Optional[date] = Query(None, description="Simulate run for specific date (defaults to today)"),
    channel: str = Query("email", description="Notification channel (email, sms)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """
    Execute smart dunning:
    Creates reminders for overdue invoices on day 1, 3, 7 (logs to console + reminders table).
    Prevents duplicate reminders for the same invoice and milestone.
    """
    return DunningService.run_dunning(db, target_date=target_date, channel=channel)


@router.get("/reminders", response_model=List[ReminderOut])
def list_reminders(
    invoice_id: Optional[int] = Query(None, description="Filter reminders by invoice ID"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=500, description="Items per page"),
    skip: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """List historical dunning reminders sent."""
    effective_page = page
    effective_size = size
    if skip is not None and limit is not None:
        effective_page = (skip // limit) + 1
        effective_size = limit

    return DunningService.get_reminders(db, invoice_id=invoice_id, page=effective_page, size=effective_size)


@router.get("/stats", response_model=DunningStatsOut)
def get_dunning_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Get smart dunning statistics and amount recovered after reminders."""
    return DunningService.get_dunning_stats(db)
