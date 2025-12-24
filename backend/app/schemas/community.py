from typing import Optional, List
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime
from app.schemas.user import UserBase

# --- Forums ---

class ForumCategorySchema(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    icon_path: Optional[str] = None
    banner_path: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ForumCategoryTree(ForumCategorySchema):
    children: List["ForumCategoryTree"] = []

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
    title: str
    is_sticky: bool
    view_count: int
    reply_count: int
    created_at: datetime
    last_activity: datetime
    
    # Author Info
    author: Optional[UserBase] = None
    
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

# --- Personals Expansion ---

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
