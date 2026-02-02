"""add_auth_logs_table

Revision ID: 8c4f19ae72b3
Revises: 7d3e52af91c2
Create Date: 2026-01-29 21:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision: str = "8c4f19ae72b3"
down_revision: Union[str, Sequence[str], None] = "7d3e52af91c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create auth_logs table for audit logging."""
    op.create_table(
        "auth_logs",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("action", sa.String(50), nullable=False, index=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("event_metadata", JSONB, nullable=True),
        sa.Column("success", sa.Boolean, nullable=False, default=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
            index=True,
        ),
    )

    # Composite index for user activity queries
    op.create_index("ix_auth_logs_user_action", "auth_logs", ["user_id", "action"])
    op.create_index(
        "ix_auth_logs_created_action", "auth_logs", ["created_at", "action"]
    )


def downgrade() -> None:
    """Drop auth_logs table."""
    op.drop_index("ix_auth_logs_created_action", table_name="auth_logs")
    op.drop_index("ix_auth_logs_user_action", table_name="auth_logs")
    op.drop_table("auth_logs")
