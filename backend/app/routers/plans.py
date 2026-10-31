from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.plan import PlanCreate, PlanUpdate, PlanOut
from backend.app.services.plan_service import PlanService

router = APIRouter(prefix="/plans", tags=["Recurring Plans"])


@router.get("", response_model=List[PlanOut])
def list_plans(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    size: Optional[int] = Query(None, ge=1, le=500, description="Page size"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """List recurring plans with pagination (page, size)."""
    if page is not None:
        page_size = size or 20
        skip = (page - 1) * page_size
        limit = page_size
    elif size is not None:
        limit = size

    return PlanService.get_plans(db, skip=skip, limit=limit)


@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    data: PlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Create a recurring plan (internal/admin)."""
    return PlanService.create_plan(db, data)


@router.get("/{id}", response_model=PlanOut)
def get_plan(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Get recurring plan details by ID (internal/admin)."""
    return PlanService.get_plan_by_id(db, id)


@router.put("/{id}", response_model=PlanOut)
def update_plan(
    id: int,
    data: PlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Update recurring plan (internal/admin)."""
    return PlanService.update_plan(db, id, data)


@router.delete("/{id}")
def delete_plan(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Delete a recurring plan (internal/admin)."""
    return PlanService.delete_plan(db, id)
