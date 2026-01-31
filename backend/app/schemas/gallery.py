"""
Gallery Schemas: Pydantic models for Media Gallery & Albums

Spec 010 - Media Gallery & Albums
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
import uuid


# ============== Media Schemas ==============

class MediaUploadResponse(BaseModel):
    """Response after successful media upload."""
    id: uuid.UUID
    type: Literal["IMAGE", "VIDEO"]
    url: str
    thumbnail_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    size_bytes: Optional[int] = None
    privacy: str = "PUBLIC"
    created_at: datetime

    class Config:
        from_attributes = True


class MediaUpdate(BaseModel):
    """Request to update media privacy."""
    privacy: Optional[Literal["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]] = None


class GalleryMedia(BaseModel):
    """Full media item details."""
    id: uuid.UUID
    user_id: uuid.UUID
    type: Literal["IMAGE", "VIDEO"]
    url: str
    thumbnail_url: Optional[str] = None
    filename: Optional[str] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    size_bytes: Optional[int] = None
    duration_seconds: Optional[int] = None  # Video only
    privacy: str
    view_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class GalleryMediaWithPosition(GalleryMedia):
    """Media item with position (for album context)."""
    position: int = 0


class GalleryPage(BaseModel):
    """Paginated list of media items."""
    items: List[GalleryMedia]
    next_cursor: Optional[str] = None
    total_count: int = 0


# ============== Album Schemas ==============

class AlbumCreate(BaseModel):
    """Request to create a new album."""
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    privacy: Literal["PUBLIC", "FRIENDS_ONLY", "PRIVATE"] = "PUBLIC"


class AlbumUpdate(BaseModel):
    """Request to update an album."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    privacy: Optional[Literal["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]] = None
    cover_media_id: Optional[uuid.UUID] = None


class AlbumMediaAdd(BaseModel):
    """Request to add media to an album."""
    media_ids: List[uuid.UUID] = Field(..., min_length=1, max_length=50)


class AlbumMediaReorder(BaseModel):
    """Request to reorder media within an album."""
    media_id: uuid.UUID
    new_position: int = Field(..., ge=0)


class AlbumBase(BaseModel):
    """Base album response."""
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    cover_media_id: Optional[uuid.UUID] = None
    cover_url: Optional[str] = None
    privacy: str
    media_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class Album(AlbumBase):
    """Album without media list."""
    pass


class AlbumWithMedia(AlbumBase):
    """Album with full media list."""
    media: List[GalleryMediaWithPosition] = []


class AlbumPage(BaseModel):
    """Paginated list of albums."""
    items: List[Album]
    next_cursor: Optional[str] = None


# ============== Share Schemas ==============

class ShareLinkCreate(BaseModel):
    """Request to generate a share link."""
    expires_in_days: int = Field(default=7, ge=1, le=30)


class ShareLinkResponse(BaseModel):
    """Response with share link details."""
    share_url: str
    share_token: str
    expires_at: datetime


# ============== Response Helpers ==============

class MediaAddResponse(BaseModel):
    """Response after adding media to album."""
    added_count: int
    album_media_count: int


class UploadProgress(BaseModel):
    """Upload progress tracking (for frontend)."""
    upload_id: str
    filename: str
    progress: float = Field(..., ge=0, le=100)
    status: Literal["pending", "uploading", "processing", "complete", "error"]
    error_message: Optional[str] = None
