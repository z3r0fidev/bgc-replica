"""
Gallery Models: GalleryMedia, Album, AlbumMedia

Spec 010 - Media Gallery & Albums
"""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Integer,
    BigInteger,
    Index,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class GalleryMedia(Base):
    """Individual media items (images/videos) in a user's gallery."""

    __tablename__ = "gallery_media"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Media type and URLs
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # IMAGE, VIDEO
    url: Mapped[str] = mapped_column(Text, nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)

    # File metadata
    filename: Mapped[Optional[str]] = mapped_column(String(255))
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    width: Mapped[Optional[int]] = mapped_column(Integer)
    height: Mapped[Optional[int]] = mapped_column(Integer)
    size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)  # For videos only

    # Privacy and stats
    privacy: Mapped[str] = mapped_column(String(20), default="PUBLIC", index=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="gallery_media")
    album_associations: Mapped[List["AlbumMedia"]] = relationship(
        "AlbumMedia", back_populates="media", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("type IN ('IMAGE', 'VIDEO')", name="ck_gallery_media_type"),
        CheckConstraint(
            "privacy IN ('PUBLIC', 'FRIENDS_ONLY', 'PRIVATE')",
            name="ck_gallery_media_privacy",
        ),
        Index("ix_gallery_media_user_created", "user_id", "created_at"),
    )


class Album(Base):
    """User-created albums for organizing gallery media."""

    __tablename__ = "albums"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Album details
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    cover_media_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("gallery_media.id", ondelete="SET NULL")
    )

    # Privacy and sharing
    privacy: Mapped[str] = mapped_column(String(20), default="PUBLIC")
    share_token: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    share_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="albums")
    cover_media: Mapped[Optional["GalleryMedia"]] = relationship(
        "GalleryMedia", foreign_keys=[cover_media_id]
    )
    media_associations: Mapped[List["AlbumMedia"]] = relationship(
        "AlbumMedia",
        back_populates="album",
        cascade="all, delete-orphan",
        order_by="AlbumMedia.position",
    )

    __table_args__ = (
        CheckConstraint(
            "privacy IN ('PUBLIC', 'FRIENDS_ONLY', 'PRIVATE')", name="ck_albums_privacy"
        ),
        Index(
            "ix_albums_share_token",
            "share_token",
            postgresql_where="share_token IS NOT NULL",
        ),
    )


class AlbumMedia(Base):
    """Junction table for many-to-many relationship between albums and media."""

    __tablename__ = "album_media"

    album_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("albums.id", ondelete="CASCADE"), primary_key=True
    )
    media_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gallery_media.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    album: Mapped["Album"] = relationship("Album", back_populates="media_associations")
    media: Mapped["GalleryMedia"] = relationship(
        "GalleryMedia", back_populates="album_associations"
    )

    __table_args__ = (Index("ix_album_media_position", "album_id", "position"),)


# Import User here to avoid circular imports - will be resolved at runtime
from app.models.user import User
