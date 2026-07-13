import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class Warning(Base):
    """A moderation warning issued to a user, with escalation tracking."""

    __tablename__ = "user_warnings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    report_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("content_reports.id", ondelete="SET NULL"), index=True
    )
    reason: Mapped[str] = mapped_column(String(500))
    severity: Mapped[str] = mapped_column(
        String(50), default="STANDARD"
    )  # LOW, STANDARD, SEVERE - informational only, does not weight escalation
    status: Mapped[str] = mapped_column(
        String(50), default="ACTIVE", index=True
    )  # ACTIVE, EXPIRED, REVOKED
    triggered_escalation: Mapped[bool] = mapped_column(Boolean, default=False)
    action_metadata: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


Index("ix_user_warnings_user_created", Warning.user_id, Warning.created_at)
Index("ix_user_warnings_user_status", Warning.user_id, Warning.status)
