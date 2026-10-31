from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.contact import Contact
from backend.app.schemas.contact import ContactCreate, ContactUpdate, ContactOut
from backend.app.services.risk_service import RiskService


class ContactService:
    @staticmethod
    def get_contacts(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None) -> List[ContactOut]:
        query = db.query(Contact)
        if search:
            query = query.filter(Contact.name.ilike(f"%{search}%") | Contact.email.ilike(f"%{search}%"))
        contacts = query.offset(skip).limit(limit).all()
        return RiskService.get_risk_for_contacts(db, contacts)

    @staticmethod
    def get_contact_by_id(db: Session, contact_id: int) -> Contact:
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Customer with ID {contact_id} not found")
        return contact

    @staticmethod
    def create_contact(db: Session, data: ContactCreate) -> ContactOut:
        contact = Contact(**data.model_dump())
        db.add(contact)
        db.commit()
        db.refresh(contact)
        return ContactOut.model_validate(contact)

    @staticmethod
    def update_contact(db: Session, contact_id: int, data: ContactUpdate) -> ContactOut:
        contact = ContactService.get_contact_by_id(db, contact_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(contact, key, value)
        db.commit()
        db.refresh(contact)
        return ContactOut.model_validate(contact)

    @staticmethod
    def delete_contact(db: Session, contact_id: int) -> dict:
        contact = ContactService.get_contact_by_id(db, contact_id)
        db.delete(contact)
        db.commit()
        return {"message": f"Customer {contact_id} deleted successfully"}
