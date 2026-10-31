from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.user import User
from backend.app.schemas.subscription import SubscriptionOut
from backend.app.schemas.invoice import InvoiceOut, PaymentOut
from backend.app.schemas.portal import PortalPaymentRequest
from backend.app.services.portal_service import PortalService

router = APIRouter(prefix="/portal", tags=["Customer Portal"])


# 1. Portal Subscriptions
@router.get("/subscriptions", response_model=List[SubscriptionOut])
def list_portal_subscriptions(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=500, description="Items per page"),
    skip: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List subscriptions owned by the logged-in customer."""
    effective_page = page
    effective_size = size
    if skip is not None and limit is not None:
        effective_page = (skip // limit) + 1
        effective_size = limit

    return PortalService.get_subscriptions(db, current_user, page=effective_page, size=effective_size)


@router.get("/subscriptions/{id}", response_model=SubscriptionOut)
def get_portal_subscription(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details for a subscription owned by the logged-in customer."""
    return PortalService.get_subscription_by_id(db, id, current_user)


@router.post("/subscriptions/{id}/pause", response_model=SubscriptionOut)
def pause_portal_subscription(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Customer can pause their own subscription if the recurring plan allows it."""
    return PortalService.pause_subscription(db, id, current_user)


@router.post("/subscriptions/{id}/cancel", response_model=SubscriptionOut)
@router.post("/subscriptions/{id}/close", response_model=SubscriptionOut)
def cancel_portal_subscription(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Customer can cancel their own subscription if the recurring plan allows it."""
    return PortalService.cancel_subscription(db, id, current_user)


# 2. Portal Invoices
@router.get("/invoices", response_model=List[InvoiceOut])
def list_portal_invoices(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=500, description="Items per page"),
    skip: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List invoices belonging to the logged-in customer."""
    effective_page = page
    effective_size = size
    if skip is not None and limit is not None:
        effective_page = (skip // limit) + 1
        effective_size = limit

    return PortalService.get_invoices(db, current_user, page=effective_page, size=effective_size)


@router.get("/invoices/{id}", response_model=InvoiceOut)
def get_portal_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details for an invoice owned by the logged-in customer."""
    return PortalService.get_invoice_by_id(db, id, current_user)


@router.post("/invoices/{id}/pay", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def pay_portal_invoice(
    id: int,
    data: Optional[PortalPaymentRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Customer pays their own invoice (mock payment).
    If no amount is provided, settles the full outstanding balance.
    """
    payload = data or PortalPaymentRequest()
    return PortalService.pay_invoice(db, id, payload, current_user)

