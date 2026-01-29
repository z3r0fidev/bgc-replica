import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Index, Float, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
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
    profile: Mapped[Optional["Profile"]] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


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

    position: Mapped[Optional[str]] = mapped_column(String(100))
    build: Mapped[Optional[str]] = mapped_column(String(100))
    hiv_status: Mapped[Optional[str]] = mapped_column(String(100))
    privacy_mode: Mapped[str] = mapped_column(String(50), default="OUT")
    is_trans_interested: Mapped[bool] = mapped_column(Boolean, default=False)
    is_personal: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    display_name: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    pronouns: Mapped[Optional[str]] = mapped_column(String(50))
    birthdate: Mapped[Optional[datetime.date]] = mapped_column(Date)
    gender_identity: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    relationship_status: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    looking_for: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String(100)))
    occupation: Mapped[Optional[str]] = mapped_column(String(255))
    industry: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    education_level: Mapped[Optional[str]] = mapped_column(String(100))
    university: Mapped[Optional[str]] = mapped_column(String(255))
    social_links: Mapped[Optional[dict]] = mapped_column(JSONB)
    privacy_settings: Mapped[Optional[dict]] = mapped_column(JSONB)

    last_active: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="profile")


Index("ix_users_metadata_gin", User.metadata_json, postgresql_using="gin")
Index("ix_profiles_roles_gin", Profile.roles, postgresql_using="gin")
Index("ix_profiles_interests_gin", Profile.interests, postgresql_using="gin")
