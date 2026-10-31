from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.template import (
    QuotationTemplateCreate,
    QuotationTemplateUpdate,
    QuotationTemplateOut,
    TemplateLineCreate,
    TemplateLineOut,
)
from backend.app.services.template_service import TemplateService

router = APIRouter(prefix="/templates", tags=["Quotation Templates"])


@router.get("", response_model=List[QuotationTemplateOut])
def list_templates(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-based)"),
    size: Optional[int] = Query(None, ge=1, le=500, description="Page size"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """List quotation templates with pagination (page, size) (internal/admin)."""
    if page is not None:
        page_size = size or 20
        skip = (page - 1) * page_size
        limit = page_size
    elif size is not None:
        limit = size

    return TemplateService.get_templates(db, skip=skip, limit=limit)


@router.post("", response_model=QuotationTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    data: QuotationTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Create a quotation template with optional lines (internal/admin)."""
    return TemplateService.create_template(db, data)


@router.get("/{id}", response_model=QuotationTemplateOut)
def get_template(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Get quotation template details by ID (internal/admin)."""
    return TemplateService.get_template_by_id(db, id)


@router.put("/{id}", response_model=QuotationTemplateOut)
def update_template(
    id: int,
    data: QuotationTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Update a quotation template (internal/admin)."""
    return TemplateService.update_template(db, id, data)


@router.delete("/{id}")
def delete_template(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Delete a quotation template (internal/admin)."""
    return TemplateService.delete_template(db, id)


@router.post("/{id}/lines", response_model=TemplateLineOut, status_code=status.HTTP_201_CREATED)
def add_template_line(
    id: int,
    data: TemplateLineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Add a product line to quotation template (internal/admin)."""
    return TemplateService.add_line(db, id, data)


@router.delete("/{id}/lines/{line_id}")
def delete_template_line(
    id: int,
    line_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Delete a line from quotation template (internal/admin)."""
    return TemplateService.delete_line(db, id, line_id)
