"""Schemas for group chat functionality."""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# ============ Group Chat Schemas ============


class GroupChatCreate(BaseModel):
    """Schema for creating a group chat."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=1024)
    max_members: int = Field(default=50, ge=2, le=100)


class GroupChatUpdate(BaseModel):
    """Schema for updating a group chat."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=1024)
    max_members: Optional[int] = Field(None, ge=2, le=100)
    settings: Optional[dict] = None


class GroupChatResponse(BaseModel):
    """Response schema for a group chat."""

    id: uuid.UUID
    name: str
    description: Optional[str]
    avatar_url: Optional[str]
    owner_id: uuid.UUID
    is_active: bool
    max_members: int
    member_count: int = 0
    last_message_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GroupChatDetail(GroupChatResponse):
    """Detailed group chat response with members."""

    members: List["GroupMemberResponse"] = []
    my_membership: Optional["GroupMemberResponse"] = None


# ============ Group Member Schemas ============


class GroupMemberAdd(BaseModel):
    """Schema for adding a member to a group."""

    user_id: uuid.UUID


class GroupMemberUpdate(BaseModel):
    """Schema for updating a member's settings."""

    role: Optional[str] = Field(None, pattern="^(admin|member)$")
    nickname: Optional[str] = Field(None, max_length=50)
    is_muted: Optional[bool] = None


class GroupMemberResponse(BaseModel):
    """Response schema for a group member."""

    id: uuid.UUID
    group_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    nickname: Optional[str]
    is_muted: bool
    last_read_at: Optional[datetime]
    joined_at: datetime
    # User info
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Group Message Schemas ============


class GroupMessageCreate(BaseModel):
    """Schema for sending a message in a group."""

    content: str = Field(..., min_length=1, max_length=5000)
    message_type: str = Field(default="text", pattern="^(text|image|system)$")
    reply_to_id: Optional[uuid.UUID] = None


class GroupMessageUpdate(BaseModel):
    """Schema for editing a message."""

    content: str = Field(..., min_length=1, max_length=5000)


class GroupMessageResponse(BaseModel):
    """Response schema for a group message."""

    id: uuid.UUID
    group_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    message_type: str
    reply_to_id: Optional[uuid.UUID]
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    # Sender info
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None

    class Config:
        from_attributes = True


class GroupMessageList(BaseModel):
    """Paginated list of group messages."""

    messages: List[GroupMessageResponse]
    total: int
    has_more: bool


# ============ List Schemas ============


class GroupChatList(BaseModel):
    """Paginated list of group chats."""

    groups: List[GroupChatResponse]
    total: int


# Forward reference resolution
GroupChatDetail.model_rebuild()
