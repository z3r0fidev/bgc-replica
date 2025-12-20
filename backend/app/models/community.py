import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, JSON, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

class ForumCategory(Base):
    __tablename__ = "forum_categories"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(1024))
    
    threads: Mapped[List["ForumThread"]] = relationship(back_populates="category", cascade="all, delete-orphan")

class ForumThread(Base):
    __tablename__ = "forum_threads"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("forum_categories.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(512))
    content: Mapped[str] = mapped_column(Text)
    media_url: Mapped[Optional[str]] = mapped_column(String(1024))
    report_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_activity: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    
    category: Mapped["ForumCategory"] = relationship(back_populates="threads")
    author: Mapped["User"] = relationship("User")
    posts: Mapped[List["ForumPost"]] = relationship(back_populates="thread", cascade="all, delete-orphan")

class ForumPost(Base):
    __tablename__ = "forum_posts"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("forum_threads.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("forum_posts.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(Text)
    media_url: Mapped[Optional[str]] = mapped_column(String(1024))
    report_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    thread: Mapped["ForumThread"] = relationship(back_populates="posts")
    author: Mapped["User"] = relationship("User")
    parent: Mapped[Optional["ForumPost"]] = relationship("ForumPost", remote_side=[id], backref="replies")

class StatusUpdate(Base):
    __tablename__ = "status_updates"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    group_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("community_groups.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(String(280))
    image_url: Mapped[Optional[str]] = mapped_column(String(1024))
    report_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    
    author: Mapped["User"] = relationship("User")
    comments: Mapped[List["PostComment"]] = relationship(back_populates="post", cascade="all, delete-orphan")

class PostComment(Base):
    __tablename__ = "post_comments"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("status_updates.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    post: Mapped["StatusUpdate"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship("User")

class CommunityGroup(Base):
    __tablename__ = "community_groups"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    memberships: Mapped[List["GroupMembership"]] = relationship(back_populates="group", cascade="all, delete-orphan")

class GroupMembership(Base):
    __tablename__ = "group_memberships"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("community_groups.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(50), default="MEMBER") # OWNER, MODERATOR, MEMBER
    
    group: Mapped["CommunityGroup"] = relationship(back_populates="memberships")
    user: Mapped["User"] = relationship("User")

class ContentReport(Base):
    __tablename__ = "content_reports"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_type: Mapped[str] = mapped_column(String(50), index=True) # THREAD, POST, STATUS, COMMENT
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    reason: Mapped[str] = mapped_column(String(255))
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(50), default="PENDING") # PENDING, RESOLVED, DISMISSED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
