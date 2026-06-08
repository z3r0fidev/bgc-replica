# Data Model: Media Gallery & Albums

## Database Tables

### GalleryMedia

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users(id), NOT NULL, ON DELETE CASCADE | Owner of the media |
| type | VARCHAR(10) | NOT NULL, CHECK (IMAGE, VIDEO) | Media type |
| url | TEXT | NOT NULL | Public URL for the media |
| thumbnail_url | TEXT | | URL for thumbnail (300x300 WebP) |
| storage_path | TEXT | NOT NULL | Path in Supabase Storage |
| filename | VARCHAR(255) | | Original filename |
| mime_type | VARCHAR(100) | | MIME type (image/jpeg, video/mp4) |
| width | INTEGER | | Original width in pixels |
| height | INTEGER | | Original height in pixels |
| size_bytes | BIGINT | | File size |
| duration_seconds | INTEGER | | Video duration (NULL for images) |
| privacy | VARCHAR(20) | DEFAULT 'PUBLIC', CHECK | PUBLIC, FRIENDS_ONLY, PRIVATE |
| view_count | INTEGER | DEFAULT 0 | Number of views |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification |

**Indexes**:
- `idx_gallery_media_user` on (user_id)
- `idx_gallery_media_privacy` on (privacy)
- `idx_gallery_media_created` on (created_at DESC)

### Albums

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users(id), NOT NULL, ON DELETE CASCADE | Album owner |
| title | VARCHAR(100) | NOT NULL | Album title |
| description | TEXT | | Optional description |
| cover_media_id | UUID | FK → gallery_media(id), ON DELETE SET NULL | Cover image |
| privacy | VARCHAR(20) | DEFAULT 'PUBLIC', CHECK | PUBLIC, FRIENDS_ONLY, PRIVATE |
| share_token | VARCHAR(64) | UNIQUE | Token for shared access |
| share_expires_at | TIMESTAMPTZ | | Expiration of share link |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification |

**Indexes**:
- `idx_albums_user` on (user_id)
- `idx_albums_share_token` on (share_token) WHERE share_token IS NOT NULL

### AlbumMedia (Junction Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| album_id | UUID | FK → albums(id), ON DELETE CASCADE | Album reference |
| media_id | UUID | FK → gallery_media(id), ON DELETE CASCADE | Media reference |
| position | INTEGER | NOT NULL, DEFAULT 0 | Display order within album |
| added_at | TIMESTAMPTZ | DEFAULT NOW() | When added to album |

**Primary Key**: (album_id, media_id)

**Indexes**:
- `idx_album_media_position` on (album_id, position)

## Pydantic Schemas

### Request Schemas

```python
class MediaUploadResponse(BaseModel):
    id: UUID
    url: str
    thumbnail_url: Optional[str]
    type: Literal["IMAGE", "VIDEO"]
    width: Optional[int]
    height: Optional[int]

class MediaUpdate(BaseModel):
    privacy: Optional[Literal["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]] = None

class AlbumCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    privacy: Literal["PUBLIC", "FRIENDS_ONLY", "PRIVATE"] = "PUBLIC"

class AlbumUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    privacy: Optional[Literal["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]] = None
    cover_media_id: Optional[UUID] = None

class AlbumMediaAdd(BaseModel):
    media_ids: List[UUID]

class AlbumMediaReorder(BaseModel):
    media_id: UUID
    new_position: int
```

### Response Schemas

```python
class GalleryMedia(BaseModel):
    id: UUID
    user_id: UUID
    type: Literal["IMAGE", "VIDEO"]
    url: str
    thumbnail_url: Optional[str]
    width: Optional[int]
    height: Optional[int]
    size_bytes: Optional[int]
    duration_seconds: Optional[int]  # Video only
    privacy: str
    view_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class Album(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str]
    cover_media_id: Optional[UUID]
    cover_url: Optional[str]  # Computed from cover_media
    privacy: str
    media_count: int  # Computed
    created_at: datetime

    class Config:
        from_attributes = True

class AlbumWithMedia(Album):
    media: List[GalleryMedia]

class GalleryPage(BaseModel):
    items: List[GalleryMedia]
    next_cursor: Optional[str]
    total_count: int
```

## SQLAlchemy Models

```python
from sqlalchemy import Column, String, Integer, BigInteger, ForeignKey, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

class GalleryMedia(Base):
    __tablename__ = "gallery_media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(10), nullable=False)  # IMAGE, VIDEO
    url = Column(Text, nullable=False)
    thumbnail_url = Column(Text)
    storage_path = Column(Text, nullable=False)
    filename = Column(String(255))
    mime_type = Column(String(100))
    width = Column(Integer)
    height = Column(Integer)
    size_bytes = Column(BigInteger)
    duration_seconds = Column(Integer)
    privacy = Column(String(20), default="PUBLIC")
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="gallery_media")
    albums = relationship("Album", secondary="album_media", back_populates="media")

    __table_args__ = (
        Index("idx_gallery_media_user", "user_id"),
        Index("idx_gallery_media_privacy", "privacy"),
        Index("idx_gallery_media_created", "created_at", postgresql_using="btree"),
    )

class Album(Base):
    __tablename__ = "albums"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    cover_media_id = Column(UUID(as_uuid=True), ForeignKey("gallery_media.id", ondelete="SET NULL"))
    privacy = Column(String(20), default="PUBLIC")
    share_token = Column(String(64), unique=True)
    share_expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="albums")
    cover_media = relationship("GalleryMedia", foreign_keys=[cover_media_id])
    media = relationship("GalleryMedia", secondary="album_media", back_populates="albums")

    __table_args__ = (
        Index("idx_albums_user", "user_id"),
        Index("idx_albums_share_token", "share_token", postgresql_where="share_token IS NOT NULL"),
    )

class AlbumMedia(Base):
    __tablename__ = "album_media"

    album_id = Column(UUID(as_uuid=True), ForeignKey("albums.id", ondelete="CASCADE"), primary_key=True)
    media_id = Column(UUID(as_uuid=True), ForeignKey("gallery_media.id", ondelete="CASCADE"), primary_key=True)
    position = Column(Integer, nullable=False, default=0)
    added_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("idx_album_media_position", "album_id", "position"),
    )
```

## Storage Structure

```
Supabase Storage: bgclive-media/
├── {user_id}/
│   └── gallery/
│       ├── {media_id}.jpg          # Original image
│       ├── {media_id}.mp4          # Original video
│       └── thumbs/
│           ├── {media_id}.webp     # Image thumbnail (300x300)
│           └── {media_id}.webp     # Video thumbnail (first frame)
```

## Privacy Enforcement

```python
def apply_gallery_privacy_mask(
    media_list: List[GalleryMedia],
    viewer_id: Optional[UUID],
    owner_id: UUID,
    is_friend: bool
) -> List[GalleryMedia]:
    """Filter media based on privacy settings."""
    is_owner = viewer_id == owner_id if viewer_id else False

    filtered = []
    for media in media_list:
        if is_owner:
            filtered.append(media)
        elif media.privacy == "PUBLIC":
            filtered.append(media)
        elif media.privacy == "FRIENDS_ONLY" and is_friend:
            filtered.append(media)
        # PRIVATE items only visible to owner

    return filtered
```
