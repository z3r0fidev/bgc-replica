"""Add admin action logs and user suspension fields

Revision ID: c3d4e5f6a7b8
Revises: 8c4f19ae72b3
Create Date: 2026-02-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "8c4f19ae72b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add suspension fields to users table
    op.add_column(
        "users",
        sa.Column("suspended_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("suspended_until", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("suspension_reason", sa.String(500), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("banned_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("ban_reason", sa.String(500), nullable=True),
    )

    # Create admin_action_logs table
    op.create_table(
        "admin_action_logs",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "admin_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "target_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("action", sa.String(50), nullable=False, index=True),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
            index=True,
        ),
    )

    # Create index for filtering by action type and date
    op.create_index(
        "ix_admin_action_logs_action_created",
        "admin_action_logs",
        ["action", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_admin_action_logs_action_created", table_name="admin_action_logs")
    op.drop_table("admin_action_logs")

    op.drop_column("users", "ban_reason")
    op.drop_column("users", "banned_at")
    op.drop_column("users", "suspension_reason")
    op.drop_column("users", "suspended_until")
    op.drop_column("users", "suspended_at")
