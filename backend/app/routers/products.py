from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_internal_or_admin
from backend.app.models.user import User
from backend.app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductOut,
    ProductVariantCreate,
    ProductVariantUpdate,
    ProductVariantOut,
)
from backend.app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=List[ProductOut])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """List products with their variants (internal/admin)."""
    return ProductService.get_products(db, skip=skip, limit=limit, search=search)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Create a new product with optional variants (internal/admin)."""
    return ProductService.create_product(db, data)


@router.get("/{id}", response_model=ProductOut)
def get_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Get product details by ID (internal/admin)."""
    return ProductService.get_product_by_id(db, id)


@router.put("/{id}", response_model=ProductOut)
def update_product(
    id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Update product details (internal/admin)."""
    return ProductService.update_product(db, id, data)


@router.delete("/{id}")
def delete_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Delete a product (internal/admin)."""
    return ProductService.delete_product(db, id)


# Product Variants endpoints
@router.post("/{id}/variants", response_model=ProductVariantOut, status_code=status.HTTP_201_CREATED)
def add_product_variant(
    id: int,
    data: ProductVariantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Add a variant to a product e.g. Brand=Odoo +560 (internal/admin)."""
    return ProductService.add_variant(db, id, data)


@router.put("/{id}/variants/{variant_id}", response_model=ProductVariantOut)
def update_product_variant(
    id: int,
    variant_id: int,
    data: ProductVariantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Update a product variant (internal/admin)."""
    return ProductService.update_variant(db, id, variant_id, data)


@router.delete("/{id}/variants/{variant_id}")
def delete_product_variant(
    id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_internal_or_admin),
):
    """Delete a product variant (internal/admin)."""
    return ProductService.delete_variant(db, id, variant_id)
