from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.tax import Tax, TaxType
from backend.app.schemas.tax import TaxCreate, TaxUpdate, TaxOut


class TaxService:
    @staticmethod
    def get_taxes(db: Session, skip: int = 0, limit: int = 100) -> List[TaxOut]:
        taxes = db.query(Tax).offset(skip).limit(limit).all()
        return [TaxOut.model_validate(t) for t in taxes]

    @staticmethod
    def get_tax_by_id(db: Session, tax_id: int) -> Tax:
        tax = db.query(Tax).filter(Tax.id == tax_id).first()
        if not tax:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tax with ID {tax_id} not found")
        return tax

    @staticmethod
    def create_tax(db: Session, data: TaxCreate) -> TaxOut:
        valid_types = [t.value for t in TaxType]
        if data.type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid tax type '{data.type}'. Allowed values: {', '.join(valid_types)}",
            )
        tax = Tax(**data.model_dump())
        db.add(tax)
        db.commit()
        db.refresh(tax)
        return TaxOut.model_validate(tax)

    @staticmethod
    def update_tax(db: Session, tax_id: int, data: TaxUpdate) -> TaxOut:
        tax = TaxService.get_tax_by_id(db, tax_id)
        update_data = data.model_dump(exclude_unset=True)
        if "type" in update_data:
            valid_types = [t.value for t in TaxType]
            if update_data["type"] not in valid_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid tax type '{update_data['type']}'. Allowed values: {', '.join(valid_types)}",
                )
        for key, value in update_data.items():
            setattr(tax, key, value)
        db.commit()
        db.refresh(tax)
        return TaxOut.model_validate(tax)

    @staticmethod
    def delete_tax(db: Session, tax_id: int) -> dict:
        tax = TaxService.get_tax_by_id(db, tax_id)
        db.delete(tax)
        db.commit()
        return {"message": f"Tax {tax_id} deleted successfully"}
