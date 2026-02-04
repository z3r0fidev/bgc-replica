import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.core.database import Base


class PersonalPost(Base):
    __tablename__ = "personal_posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category_slug: Mapped[str] = mapped_column(String(255), index=True)
    content: Mapped[str] = mapped_column(Text)
    media_ids: Mapped[Optional[List[uuid.UUID]]] = mapped_column(ARRAY(UUID(as_uuid=True)))

    follow_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    author: Mapped["User"] = relationship("User")
    comments: Mapped[List["PersonalPostComment"]] = relationship(back_populates="post", cascade="all, delete-orphan")


class PersonalPostFollower(Base):
    __tablename__ = "personal_post_followers"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("personal_posts.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PersonalPostComment(Base):
    __tablename__ = "personal_post_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("personal_posts.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("personal_post_comments.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    post: Mapped["PersonalPost"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship("User")
    parent: Mapped[Optional["PersonalPostComment"]] = relationship("PersonalPostComment", remote_side=[id], backref="replies")


# Import User for relationship references
from app.models.user import User
