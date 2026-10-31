from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.template import QuotationTemplate, TemplateLine
from backend.app.models.product import Product, ProductVariant
from backend.app.schemas.template import (
    QuotationTemplateCreate,
    QuotationTemplateUpdate,
    QuotationTemplateOut,
    TemplateLineCreate,
    TemplateLineOut,
)


class TemplateService:
    @staticmethod
    def get_templates(db: Session, skip: int = 0, limit: int = 100) -> List[QuotationTemplateOut]:
        templates = db.query(QuotationTemplate).offset(skip).limit(limit).all()
        return [QuotationTemplateOut.model_validate(t) for t in templates]

    @staticmethod
    def get_template_by_id(db: Session, template_id: int) -> QuotationTemplate:
        template = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Quotation template with ID {template_id} not found")
        return template

    @staticmethod
    def create_template(db: Session, data: QuotationTemplateCreate) -> QuotationTemplateOut:
        template = QuotationTemplate(
            name=data.name,
            validity_days=data.validity_days,
            plan_id=data.plan_id,
        )
        db.add(template)
        db.flush()

        if data.lines:
            for line_data in data.lines:
                # Validate product exists
                product = db.query(Product).filter(Product.id == line_data.product_id).first()
                if not product:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product {line_data.product_id} does not exist")
                if line_data.variant_id:
                    variant = db.query(ProductVariant).filter(ProductVariant.id == line_data.variant_id).first()
                    if not variant:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Variant {line_data.variant_id} does not exist")

                line = TemplateLine(
                    template_id=template.id,
                    product_id=line_data.product_id,
                    variant_id=line_data.variant_id,
                    qty=line_data.qty,
                )
                db.add(line)

        db.commit()
        db.refresh(template)
        return QuotationTemplateOut.model_validate(template)

    @staticmethod
    def update_template(db: Session, template_id: int, data: QuotationTemplateUpdate) -> QuotationTemplateOut:
        template = TemplateService.get_template_by_id(db, template_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(template, key, value)
        db.commit()
        db.refresh(template)
        return QuotationTemplateOut.model_validate(template)

    @staticmethod
    def delete_template(db: Session, template_id: int) -> dict:
        template = TemplateService.get_template_by_id(db, template_id)
        db.delete(template)
        db.commit()
        return {"message": f"Quotation template {template_id} deleted successfully"}

    @staticmethod
    def add_line(db: Session, template_id: int, data: TemplateLineCreate) -> TemplateLineOut:
        TemplateService.get_template_by_id(db, template_id)
        # Validate product
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product {data.product_id} does not exist")
        if data.variant_id:
            variant = db.query(ProductVariant).filter(ProductVariant.id == data.variant_id).first()
            if not variant:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Variant {data.variant_id} does not exist")

        line = TemplateLine(
            template_id=template_id,
            product_id=data.product_id,
            variant_id=data.variant_id,
            qty=data.qty,
        )
        db.add(line)
        db.commit()
        db.refresh(line)
        return TemplateLineOut.model_validate(line)

    @staticmethod
    def delete_line(db: Session, template_id: int, line_id: int) -> dict:
        line = db.query(TemplateLine).filter(
            TemplateLine.id == line_id,
            TemplateLine.template_id == template_id,
        ).first()
        if not line:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template line {line_id} not found in template {template_id}")
        db.delete(line)
        db.commit()
        return {"message": f"Template line {line_id} deleted successfully"}
