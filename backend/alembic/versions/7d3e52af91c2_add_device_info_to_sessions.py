"""add_device_info_to_sessions

Revision ID: 7d3e52af91c2
Revises: 5e91d72c83a1
Create Date: 2026-01-29 20:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "7d3e52af91c2"
down_revision: Union[str, Sequence[str], None] = "5e91d72c83a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add device tracking fields to sessions table."""
    op.add_column("sessions", sa.Column("device_info", JSONB, nullable=True))
    op.add_column("sessions", sa.Column("ip_address", sa.String(45), nullable=True))
    op.add_column("sessions", sa.Column("user_agent", sa.String(512), nullable=True))
    op.add_column("sessions", sa.Column("last_active", sa.DateTime(), nullable=True))
    op.add_column(
        "sessions",
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True
        ),
    )

    # Index for listing user sessions
    op.create_index(
        "ix_sessions_user_id_last_active", "sessions", ["user_id", "last_active"]
    )


def downgrade() -> None:
    """Remove device tracking fields from sessions table."""
    op.drop_index("ix_sessions_user_id_last_active", table_name="sessions")
    op.drop_column("sessions", "created_at")
    op.drop_column("sessions", "last_active")
    op.drop_column("sessions", "user_agent")
    op.drop_column("sessions", "ip_address")
    op.drop_column("sessions", "device_info")
