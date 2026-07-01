from typing import Optional
import uuid
from datetime import datetime
from app.schemas.base import SafeBaseModel


class StoryBase(SafeBaseModel):
    title: str
    content: str
    cover_url: Optional[str] = None


class StoryCreate(StoryBase):
    pass


class StoryUpdate(SafeBaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    cover_url: Optional[str] = None


class Story(StoryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
