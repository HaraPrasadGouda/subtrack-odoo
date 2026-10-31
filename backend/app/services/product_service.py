from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.product import Product, ProductVariant
from backend.app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductOut,
    ProductVariantCreate,
    ProductVariantUpdate,
    ProductVariantOut,
)


class ProductService:
    @staticmethod
    def get_products(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None) -> List[ProductOut]:
        query = db.query(Product)
        if search:
            query = query.filter(Product.name.ilike(f"%{search}%"))
        products = query.offset(skip).limit(limit).all()
        return [ProductOut.model_validate(p) for p in products]

    @staticmethod
    def get_product_by_id(db: Session, product_id: int) -> Product:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with ID {product_id} not found")
        return product

    @staticmethod
    def create_product(db: Session, data: ProductCreate) -> ProductOut:
        product_dict = data.model_dump(exclude={"variants"})
        product = Product(**product_dict)
        db.add(product)
        db.flush()

        if data.variants:
            for variant_in in data.variants:
                variant = ProductVariant(product_id=product.id, **variant_in.model_dump())
                db.add(variant)

        db.commit()
        db.refresh(product)
        return ProductOut.model_validate(product)

    @staticmethod
    def update_product(db: Session, product_id: int, data: ProductUpdate) -> ProductOut:
        product = ProductService.get_product_by_id(db, product_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(product, key, value)
        db.commit()
        db.refresh(product)
        return ProductOut.model_validate(product)

    @staticmethod
    def delete_product(db: Session, product_id: int) -> dict:
        product = ProductService.get_product_by_id(db, product_id)
        db.delete(product)
        db.commit()
        return {"message": f"Product {product_id} deleted successfully"}

    # Variant operations
    @staticmethod
    def add_variant(db: Session, product_id: int, data: ProductVariantCreate) -> ProductVariantOut:
        ProductService.get_product_by_id(db, product_id)
        variant = ProductVariant(product_id=product_id, **data.model_dump())
        db.add(variant)
        db.commit()
        db.refresh(variant)
        return ProductVariantOut.model_validate(variant)

    @staticmethod
    def update_variant(db: Session, product_id: int, variant_id: int, data: ProductVariantUpdate) -> ProductVariantOut:
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        ).first()
        if not variant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Variant with ID {variant_id} not found for product {product_id}")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(variant, key, value)
        db.commit()
        db.refresh(variant)
        return ProductVariantOut.model_validate(variant)

    @staticmethod
    def delete_variant(db: Session, product_id: int, variant_id: int) -> dict:
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        ).first()
        if not variant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Variant with ID {variant_id} not found for product {product_id}")

        db.delete(variant)
        db.commit()
        return {"message": f"Variant {variant_id} deleted successfully"}
