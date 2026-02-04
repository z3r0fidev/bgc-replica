from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import uuid



class BlockedUserInfo(BaseModel):
    """Basic user info for blocked user display."""

    id: uuid.UUID
    name: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BlockedUserSchema(BaseModel):
    """Schema for a blocked user entry."""

    id: uuid.UUID
    user: BlockedUserInfo
    blocked_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BlockStatusSchema(BaseModel):
    """Schema for block status between two users."""

    is_blocked: bool
    blocked_by_me: bool
    blocked_by_them: bool


class BlockResponseSchema(BaseModel):
    """Response schema for block/unblock operations."""

    success: bool
    message: str
