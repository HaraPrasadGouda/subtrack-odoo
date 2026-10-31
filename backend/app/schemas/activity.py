from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.auth import UserOut


class ActivityLogOut(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    user_id: Optional[int] = None
    created_at: datetime
    user: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)
