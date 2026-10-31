from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_admin
from backend.app.models.user import User
from backend.app.schemas.discount import DiscountCreate, DiscountUpdate, DiscountOut
from backend.app.services.discount_service import DiscountService

router = APIRouter(prefix="/discounts", tags=["Discounts"])


@router.get("", response_model=List[DiscountOut])
def list_discounts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """List discounts (admin only)."""
    return DiscountService.get_discounts(db, skip=skip, limit=limit)


@router.post("", response_model=DiscountOut, status_code=status.HTTP_201_CREATED)
def create_discount(
    data: DiscountCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Create a discount (admin only)."""
    return DiscountService.create_discount(db, data)


@router.get("/{id}", response_model=DiscountOut)
def get_discount(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Get discount details by ID (admin only)."""
    return DiscountService.get_discount_by_id(db, id)


@router.put("/{id}", response_model=DiscountOut)
def update_discount(
    id: int,
    data: DiscountUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Update a discount (admin only)."""
    return DiscountService.update_discount(db, id, data)


@router.delete("/{id}")
def delete_discount(
    id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Delete a discount (admin only)."""
    return DiscountService.delete_discount(db, id)
