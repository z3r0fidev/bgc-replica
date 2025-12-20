from typing import Optional, List
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

# --- Forums ---

class ForumCategorySchema(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ForumPostSchema(BaseModel):
    id: uuid.UUID
    thread_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    author_id: uuid.UUID
    content: str
    media_url: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ForumThreadSchema(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    author_id: uuid.UUID
    title: str
    content: str
    media_url: Optional[str] = None
    created_at: datetime
    last_activity: datetime
    model_config = ConfigDict(from_attributes=True)

class ForumThreadCreate(BaseModel):
    category_id: uuid.UUID
    title: str
    content: str
    media_url: Optional[str] = None

class ForumPostCreate(BaseModel):
    thread_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    content: str
    media_url: Optional[str] = None

# --- Feed ---

class StatusUpdateSchema(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    content: str
    image_url: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StatusUpdateCreate(BaseModel):
    content: str
    image_url: Optional[str] = None

class PostCommentSchema(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    author_id: uuid.UUID
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PostCommentCreate(BaseModel):
    content: str

# --- Groups ---

class GroupSchema(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    owner_id: uuid.UUID
    is_private: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_private: bool = False

# --- Moderation ---

class ReportSchema(BaseModel):
    id: uuid.UUID
    reporter_id: uuid.UUID
    content_type: str
    content_id: uuid.UUID
    reason: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ReportCreate(BaseModel):
    content_type: str
    content_id: uuid.UUID
    reason: str
