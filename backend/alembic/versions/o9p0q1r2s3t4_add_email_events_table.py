"""add_email_events_table

Revision ID: o9p0q1r2s3t4
Revises: n8o9p0q1r2s3
Create Date: 2026-07-28 01:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "o9p0q1r2s3t4"
down_revision: Union[str, Sequence[str], None] = "n8o9p0q1r2s3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resend_email_id", sa.String(length=255), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_events_resend_email_id"), "email_events", ["resend_email_id"]
    )
    op.create_index(op.f("ix_email_events_event_type"), "email_events", ["event_type"])
    op.create_index(
        op.f("ix_email_events_recipient_email"), "email_events", ["recipient_email"]
    )
    op.create_index(op.f("ix_email_events_created_at"), "email_events", ["created_at"])


def downgrade() -> None:
    op.drop_index(op.f("ix_email_events_created_at"), table_name="email_events")
    op.drop_index(op.f("ix_email_events_recipient_email"), table_name="email_events")
    op.drop_index(op.f("ix_email_events_event_type"), table_name="email_events")
    op.drop_index(op.f("ix_email_events_resend_email_id"), table_name="email_events")
    op.drop_table("email_events")
