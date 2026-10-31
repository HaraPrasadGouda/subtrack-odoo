from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin, require_admin
from backend.app.models.user import User
from backend.app.schemas.tax import TaxCreate, TaxUpdate, TaxOut
from backend.app.services.tax_service import TaxService

router = APIRouter(prefix="/taxes", tags=["Taxes"])


@router.get("", response_model=List[TaxOut])
def list_taxes(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    size: Optional[int] = Query(None, ge=1, le=500, description="Page size"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """List taxes with pagination (page, size)."""
    if page is not None:
        page_size = size or 20
        skip = (page - 1) * page_size
        limit = page_size
    elif size is not None:
        limit = size

    return TaxService.get_taxes(db, skip=skip, limit=limit)


@router.get("/{id}", response_model=TaxOut)
def get_tax(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Get tax details by ID (internal/admin)."""
    return TaxService.get_tax_by_id(db, id)


@router.post("", response_model=TaxOut, status_code=status.HTTP_201_CREATED)
def create_tax(
    data: TaxCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Create a tax (admin only)."""
    return TaxService.create_tax(db, data)


@router.put("/{id}", response_model=TaxOut)
def update_tax(
    id: int,
    data: TaxUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Update a tax (admin only)."""
    return TaxService.update_tax(db, id, data)


@router.delete("/{id}")
def delete_tax(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Delete a tax (admin only)."""
    return TaxService.delete_tax(db, id)
