from typing import Optional
from pydantic import BaseModel, EmailStr
from backend.app.schemas.auth import UserOut


class UserCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "internal"  # admin, internal, portal

