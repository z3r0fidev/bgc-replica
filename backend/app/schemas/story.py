from typing import Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

class StoryBase(BaseModel):
    title: str
    content: str
    cover_url: Optional[str] = None

class StoryCreate(StoryBase):
    pass

class StoryUpdate(BaseModel):
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
