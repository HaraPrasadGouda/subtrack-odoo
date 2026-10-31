from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.discount import Discount, DiscountType, DiscountAppliesTo
from backend.app.schemas.discount import DiscountCreate, DiscountUpdate, DiscountOut


class DiscountService:
    @staticmethod
    def get_discounts(db: Session, skip: int = 0, limit: int = 100) -> List[DiscountOut]:
        discounts = db.query(Discount).offset(skip).limit(limit).all()
        return [DiscountOut.model_validate(d) for d in discounts]

    @staticmethod
    def get_discount_by_id(db: Session, discount_id: int) -> Discount:
        discount = db.query(Discount).filter(Discount.id == discount_id).first()
        if not discount:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Discount with ID {discount_id} not found")
        return discount

    @staticmethod
    def create_discount(db: Session, data: DiscountCreate) -> DiscountOut:
        valid_types = [t.value for t in DiscountType]
        if data.type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid discount type '{data.type}'. Allowed values: {', '.join(valid_types)}",
            )
        valid_applies = [a.value for a in DiscountAppliesTo]
        if data.applies_to not in valid_applies:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid applies_to '{data.applies_to}'. Allowed values: {', '.join(valid_applies)}",
            )

        discount = Discount(**data.model_dump())
        db.add(discount)
        db.commit()
        db.refresh(discount)
        return DiscountOut.model_validate(discount)

    @staticmethod
    def update_discount(db: Session, discount_id: int, data: DiscountUpdate) -> DiscountOut:
        discount = DiscountService.get_discount_by_id(db, discount_id)
        update_data = data.model_dump(exclude_unset=True)
        if "type" in update_data:
            valid_types = [t.value for t in DiscountType]
            if update_data["type"] not in valid_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid discount type '{update_data['type']}'. Allowed values: {', '.join(valid_types)}",
                )
        if "applies_to" in update_data:
            valid_applies = [a.value for a in DiscountAppliesTo]
            if update_data["applies_to"] not in valid_applies:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid applies_to '{update_data['applies_to']}'. Allowed values: {', '.join(valid_applies)}",
                )

        for key, value in update_data.items():
            setattr(discount, key, value)
        db.commit()
        db.refresh(discount)
        return DiscountOut.model_validate(discount)

    @staticmethod
    def delete_discount(db: Session, discount_id: int) -> dict:
        discount = DiscountService.get_discount_by_id(db, discount_id)
        db.delete(discount)
        db.commit()
        return {"message": f"Discount {discount_id} deleted successfully"}
