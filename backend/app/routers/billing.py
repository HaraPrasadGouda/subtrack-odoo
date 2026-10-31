from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.invoice import BillingRunOut
from backend.app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.post("/run", response_model=BillingRunOut)
def run_billing(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """
    Automated billing run:
    Bills all active subscriptions where next_billing_date <= today,
    then moves next_billing_date by billing_period.
    Never bills twice (unique constraint on subscription_id, period_start).
    Returns created and skipped counts.
    """
    return InvoiceService.run_billing(db, current_user.id)

