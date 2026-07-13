"""Add user_warnings table

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-07-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "h2i3j4k5l6m7"
down_revision: Union[str, None] = "g1h2i3j4k5l6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_warnings",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "admin_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "report_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("content_reports.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column(
            "severity", sa.String(50), nullable=False, server_default="STANDARD"
        ),
        sa.Column("status", sa.String(50), nullable=False, server_default="ACTIVE"),
        sa.Column(
            "triggered_escalation",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("action_metadata", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
            index=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_user_warnings_status", "user_warnings", ["status"]
    )
    op.create_index(
        "ix_user_warnings_user_created",
        "user_warnings",
        ["user_id", "created_at"],
    )
    op.create_index(
        "ix_user_warnings_user_status",
        "user_warnings",
        ["user_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_warnings_user_status", table_name="user_warnings")
    op.drop_index("ix_user_warnings_user_created", table_name="user_warnings")
    op.drop_index("ix_user_warnings_status", table_name="user_warnings")
    op.drop_table("user_warnings")
