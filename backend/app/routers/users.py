from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import require_admin
from backend.app.models.user import User
from backend.app.schemas.user import UserCreateRequest
from backend.app.schemas.auth import UserOut
from backend.app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    request: UserCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Create internal/admin/portal user.
    Only accessible by users with role 'admin'.
    """
    return UserService.create_user(db, request)


@router.get("", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    List all users.
    Only accessible by users with role 'admin'.
    """
    return UserService.get_users(db, skip=skip, limit=limit)

