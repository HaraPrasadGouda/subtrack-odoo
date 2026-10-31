from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.security import validate_password_strength, get_password_hash
from backend.app.models.user import User, UserRole
from backend.app.schemas.user import UserCreateRequest
from backend.app.schemas.auth import UserOut


class UserService:
    @staticmethod
    def create_user(db: Session, request: UserCreateRequest) -> UserOut:
        # Validate role
        valid_roles = [r.value for r in UserRole]
        if request.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{request.role}'. Allowed roles: {', '.join(valid_roles)}",
            )

        # Validate password strength
        validate_password_strength(request.password)

        normalized_email = request.email.lower().strip()
        existing_user = db.query(User).filter(User.email == normalized_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered.",
            )

        new_user = User(
            name=request.name.strip(),
            email=normalized_email,
            password_hash=get_password_hash(request.password),
            role=request.role,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return UserOut.model_validate(new_user)

    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[UserOut]:
        users = db.query(User).offset(skip).limit(limit).all()
        return [UserOut.model_validate(u) for u in users]

