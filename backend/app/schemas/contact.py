from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class ContactBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_state: Optional[str] = None
    user_id: Optional[int] = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_state: Optional[str] = None
    user_id: Optional[int] = None


class ContactOut(ContactBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
