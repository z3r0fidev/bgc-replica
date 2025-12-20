import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, JSON, Index, Float, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True)
    email_verified: Mapped[Optional[datetime]] = mapped_column(DateTime)
    image: Mapped[Optional[str]] = mapped_column(String(1024))
    hashed_password: Mapped[Optional[str]] = mapped_column(String(1024))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    accounts: Mapped[List["Account"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[List["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    authenticators: Mapped[List["Authenticator"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    
    # Phase 2 Relationships
    profile: Mapped[Optional["Profile"]] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    media: Mapped[List["Media"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    
    # Social Graph Relationships
    relationships_sent: Mapped[List["Relationship"]] = relationship(
        "Relationship",
        foreign_keys="[Relationship.from_user_id]",
        back_populates="from_user",
        cascade="all, delete-orphan"
    )
    relationships_received: Mapped[List["Relationship"]] = relationship(
        "Relationship",
        foreign_keys="[Relationship.to_user_id]",
        back_populates="to_user",
        cascade="all, delete-orphan"
    )
    
    ratings_sent: Mapped[List["ProfileRating"]] = relationship(
        "ProfileRating",
        foreign_keys="[ProfileRating.from_user_id]",
        back_populates="from_user",
        cascade="all, delete-orphan"
    )
    ratings_received: Mapped[List["ProfileRating"]] = relationship(
        "ProfileRating",
        foreign_keys="[ProfileRating.to_user_id]",
        back_populates="to_user",
        cascade="all, delete-orphan"
    )

class Account(Base):
    __tablename__ = "accounts"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(255))
    provider_account_id: Mapped[str] = mapped_column(String(255))
    refresh_token: Mapped[Optional[str]] = mapped_column(Text)
    access_token: Mapped[Optional[str]] = mapped_column(Text)
    expires_at: Mapped[Optional[int]] = mapped_column()
    token_type: Mapped[Optional[str]] = mapped_column(String(255))
    scope: Mapped[Optional[str]] = mapped_column(String(255))
    id_token: Mapped[Optional[str]] = mapped_column(Text)
    session_state: Mapped[Optional[str]] = mapped_column(String(255))
    
    user: Mapped["User"] = relationship(back_populates="accounts")
    
    __table_args__ = (
        Index("ix_accounts_provider_provider_account_id", "provider", "provider_account_id", unique=True),
    )

class Session(Base):
    __tablename__ = "sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_token: Mapped[str] = mapped_column(String(1024), unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires: Mapped[datetime] = mapped_column(DateTime, index=True)
    
    user: Mapped["User"] = relationship(back_populates="sessions")

class VerificationToken(Base):
    __tablename__ = "verification_tokens"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identifier: Mapped[str] = mapped_column(String(255))
    token: Mapped[str] = mapped_column(String(1024), unique=True)
    expires: Mapped[datetime] = mapped_column(DateTime)

class Authenticator(Base):
    __tablename__ = "authenticators"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    credential_id: Mapped[str] = mapped_column(String(1024), unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider_account_id: Mapped[str] = mapped_column(String(255))
    credential_public_key: Mapped[str] = mapped_column(Text)
    counter: Mapped[int] = mapped_column()
    credential_device_type: Mapped[str] = mapped_column(String(255))
    credential_backed_up: Mapped[bool] = mapped_column(Boolean)
    transports: Mapped[Optional[str]] = mapped_column(String(255))
    
    user: Mapped["User"] = relationship(back_populates="authenticators")
    
    __table_args__ = (
        Index("ix_authenticators_user_id_credential_id", "user_id", "credential_id", unique=True),
    )

# Phase 2 Models

class Profile(Base):
    __tablename__ = "profiles"
    
    id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    bio: Mapped[Optional[str]] = mapped_column(Text)
    height: Mapped[Optional[str]] = mapped_column(String(50))
    weight: Mapped[Optional[int]] = mapped_column()
    ethnicity: Mapped[Optional[str]] = mapped_column(String(100))
    body_type: Mapped[Optional[str]] = mapped_column(String(100))
    roles: Mapped[Optional[dict]] = mapped_column(JSONB)
    interests: Mapped[Optional[dict]] = mapped_column(JSONB)
    location_city: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    location_state: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    location_lat: Mapped[Optional[float]] = mapped_column(Float)
    location_lng: Mapped[Optional[float]] = mapped_column(Float)
    privacy_level: Mapped[str] = mapped_column(String(50), default="PUBLIC")
    last_active: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    user: Mapped["User"] = relationship(back_populates="profile")

class Media(Base):
    __tablename__ = "media"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(1024))
    storage_path: Mapped[str] = mapped_column(String(1024))
    type: Mapped[str] = mapped_column(String(50)) # IMAGE, VIDEO
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    user: Mapped["User"] = relationship(back_populates="media")

class Relationship(Base):
    __tablename__ = "relationships"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    to_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(50)) # FRIEND, FAVORITE, BLOCKED
    status: Mapped[str] = mapped_column(String(50)) # PENDING, ACCEPTED, REJECTED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    from_user: Mapped["User"] = relationship("User", foreign_keys=[from_user_id], back_populates="relationships_sent")
    to_user: Mapped["User"] = relationship("User", foreign_keys=[to_user_id], back_populates="relationships_received")
    
    __table_args__ = (
        Index("ix_relationships_from_to_type", "from_user_id", "to_user_id", "type", unique=True),
    )

class ProfileRating(Base):
    __tablename__ = "profile_ratings"
    
    from_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    to_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    score: Mapped[int] = mapped_column(CheckConstraint("score >= 1 AND score <= 10"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    from_user: Mapped["User"] = relationship("User", foreign_keys=[from_user_id], back_populates="ratings_sent")
    to_user: Mapped["User"] = relationship("User", foreign_keys=[to_user_id], back_populates="ratings_received")