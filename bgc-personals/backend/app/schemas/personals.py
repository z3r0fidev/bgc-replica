from typing import Optional, List
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime


class PersonalPostCreate(BaseModel):
    category: str
    content: str
    media_ids: List[uuid.UUID] = []


class PersonalPostSchema(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    category_slug: str
    content: str
    media_ids: Optional[List[uuid.UUID]] = None
    follow_count: int
    comment_count: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PersonalPostCommentCreate(BaseModel):
    parent_id: Optional[uuid.UUID] = None
    content: str


class PersonalPostCommentSchema(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    author_id: uuid.UUID
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
