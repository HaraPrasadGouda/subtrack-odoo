from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.contact import ContactCreate, ContactUpdate, ContactOut
from backend.app.schemas.risk import CustomerRiskOut
from backend.app.services.contact_service import ContactService
from backend.app.services.risk_service import RiskService

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=List[ContactOut])
def list_customers(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    size: Optional[int] = Query(None, ge=1, le=500, description="Page size"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """List customers with optional search by name or email and pagination (page, size)."""
    if page is not None:
        page_size = size or 20
        skip = (page - 1) * page_size
        limit = page_size
    elif size is not None:
        limit = size

    return ContactService.get_contacts(db, skip=skip, limit=limit, search=search)


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Create a customer (internal/admin)."""
    return ContactService.create_contact(db, data)


@router.get("/{id}", response_model=ContactOut)
def get_customer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Get customer details by ID (internal/admin)."""
    return ContactService.get_contact_by_id(db, id)


@router.put("/{id}", response_model=ContactOut)
def update_customer(
    id: int,
    data: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Update customer details (internal/admin)."""
    return ContactService.update_contact(db, id, data)


@router.delete("/{id}")
def delete_customer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Delete a customer (internal/admin)."""
    return ContactService.delete_contact(db, id)


@router.get("/{id}/risk", response_model=CustomerRiskOut)
def get_customer_churn_risk(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """
    Get customer churn risk analysis:
    Score computed from late payments, paused subscriptions, expiry within 15 days,
    and overdue invoices -> returns High / Medium / Low with explanatory reasons list.
    """
    return RiskService.evaluate_customer_risk(db, id)
