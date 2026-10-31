from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionOut,
    SubscriptionFromTemplate,
    SubscriptionStatusUpdate,
    SubscriptionLinePriceUpdate,
    ChangePlanRequest,
    ChangePlanResponse,
)
from backend.app.schemas.activity import ActivityLogOut
from backend.app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("", response_model=List[SubscriptionOut])
def list_subscriptions(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    size: Optional[int] = Query(None, ge=1, le=500, description="Page size"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """List subscriptions with optional status and customer filters and pagination (page, size)."""
    if page is not None:
        page_size = size or 20
        skip = (page - 1) * page_size
        limit = page_size
    elif size is not None:
        limit = size

    return SubscriptionService.get_subscriptions(
        db,
        skip=skip,
        limit=limit,
        status_filter=status,
        customer_id=customer_id,
    )


@router.post("", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_subscription(
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Create a subscription with auto number (SUB-0001) and auto-calculated lines."""
    return SubscriptionService.create_subscription(db, data, current_user.id)


@router.post("/from-template/{id}", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_from_template(
    id: int,
    data: SubscriptionFromTemplate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Create a subscription pre-filled from quotation template lines and plan."""
    return SubscriptionService.create_from_template(db, id, data, current_user.id)


@router.get("/{id}", response_model=SubscriptionOut)
def get_subscription(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Get subscription details by ID."""
    sub = SubscriptionService.get_subscription_by_id(db, id)
    return SubscriptionService.to_out(db, sub)


@router.post("/{id}/status", response_model=SubscriptionOut)
def update_status(
    id: int,
    data: SubscriptionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Update subscription status with allowed transitions and plan constraints."""
    return SubscriptionService.update_status(db, id, data.status, current_user.id)


@router.post("/{id}/pause", response_model=SubscriptionOut)
def pause_subscription(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Pause an active subscription if plan allows."""
    return SubscriptionService.pause_subscription(db, id, current_user.id)


@router.post("/{id}/renew", response_model=SubscriptionOut)
def renew_subscription(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Renew subscription if plan allows."""
    return SubscriptionService.renew_subscription(db, id, current_user.id)


@router.post("/{id}/close", response_model=SubscriptionOut)
def close_subscription(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Close subscription if plan allows."""
    return SubscriptionService.close_subscription(db, id, current_user.id)


from backend.app.schemas.invoice import InvoiceOut
from backend.app.services.invoice_service import InvoiceService


@router.post("/{id}/invoice", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_subscription_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Generate invoice for subscription's current billing period."""
    return InvoiceService.create_invoice_for_subscription(db, id, current_user.id)


@router.post("/{id}/change-plan", response_model=ChangePlanResponse)
def change_subscription_plan(
    id: int,
    data: ChangePlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """
    Change subscription plan with proration:
    Calculates unused amount of current period, prorates new plan,
    and creates an adjusted invoice.
    """
    return SubscriptionService.change_plan(db, id, data.new_plan_id, current_user.id)


@router.put("/{id}/lines/{line_id}", response_model=SubscriptionOut)
def update_subscription_line_price(
    id: int,
    line_id: int,
    data: SubscriptionLinePriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """
    Update line price/quantity on subscription:
    Recalculates line amount and logs a price_change event in the activity timeline.
    """
    return SubscriptionService.update_line_price(
        db, id, line_id, data.unit_price, new_qty=data.qty, user_id=current_user.id
    )


@router.get("/{id}/timeline", response_model=List[ActivityLogOut])
def get_subscription_timeline(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Get the audit and activity timeline for a subscription."""
    logs = SubscriptionService.get_timeline(db, id)
    return [ActivityLogOut.model_validate(l) for l in logs]
