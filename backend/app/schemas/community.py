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
    reviewed_by: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)


class ReporterInfo(BaseModel):
    id: uuid.UUID
    name: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None


class ReportedUserInfo(BaseModel):
    id: uuid.UUID
    name: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None


class ReportDetailSchema(BaseModel):
    """Detailed report info for moderation queue."""

    id: uuid.UUID
    reporter: ReporterInfo
    content_type: str
    content_id: uuid.UUID
    reason: str
    status: str
    created_at: datetime
    reviewed_by: Optional[uuid.UUID] = None
    # For USER reports
    reported_user: Optional[ReportedUserInfo] = None
    # For content reports
    content_preview: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ReportCreate(BaseModel):
    content_type: str
    content_id: uuid.UUID
    reason: str


class UserReportCreate(BaseModel):
    """Schema for reporting a user."""

    user_id: uuid.UUID
    reason: str  # HARASSMENT, SPAM, INAPPROPRIATE, FAKE_PROFILE, OTHER
    details: Optional[str] = None


class ResolveReportRequest(BaseModel):
    """Request to resolve a report."""

    action: str  # dismiss, warn_user, delete_content, ban_user


class ModerationStatsSchema(BaseModel):
    """Statistics for the moderation dashboard."""

    pending_count: int
    resolved_today: int
    total_reports: int
    reports_by_type: dict
    reports_by_reason: dict
