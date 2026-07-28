import uuid
from datetime import datetime

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class EmailEvent(Base):
    """
    A Resend webhook delivery event (bounce, complaint, or suppression-list
    change). Persisted instead of silently dropped so these are actually
    visible/queryable - previously the app had no way to know a
    verification/reset/notification email had bounced or been marked spam.
    """

    __tablename__ = "email_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resend_email_id: Mapped[str | None] = mapped_column(String(255), index=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    recipient_email: Mapped[str] = mapped_column(String(255), index=True)
    payload: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
