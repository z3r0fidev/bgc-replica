"""add_group_chats

Revision ID: 9f2b83cd41a7
Revises: 8c4f19ae72b3
Create Date: 2026-01-29 21:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision: str = "9f2b83cd41a7"
down_revision: Union[str, Sequence[str], None] = "8c4f19ae72b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create group chat tables."""
    # Group Chats
    op.create_table(
        "group_chats",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("avatar_url", sa.String(1024), nullable=True),
        sa.Column(
            "owner_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("max_members", sa.Integer, nullable=False, default=50),
        sa.Column("settings", JSONB, nullable=True),
        sa.Column("last_message_at", sa.DateTime, nullable=True),
        sa.Column(
            "created_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
    )

    # Group Members
    op.create_table(
        "group_members",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "group_id",
            UUID(as_uuid=True),
            sa.ForeignKey("group_chats.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("role", sa.String(20), nullable=False, default="member"),
        sa.Column("nickname", sa.String(50), nullable=True),
        sa.Column("is_muted", sa.Boolean, nullable=False, default=False),
        sa.Column("last_read_at", sa.DateTime, nullable=True),
        sa.Column(
            "joined_at", sa.DateTime, server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_group_members_group_user",
        "group_members",
        ["group_id", "user_id"],
        unique=True,
    )

    # Group Messages
    op.create_table(
        "group_messages",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "group_id",
            UUID(as_uuid=True),
            sa.ForeignKey("group_chats.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "sender_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("message_type", sa.String(20), nullable=False, default="text"),
        sa.Column(
            "reply_to_id",
            UUID(as_uuid=True),
            sa.ForeignKey("group_messages.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_edited", sa.Boolean, nullable=False, default=False),
        sa.Column("is_deleted", sa.Boolean, nullable=False, default=False),
        sa.Column(
            "created_at",
            sa.DateTime,
            server_default=sa.func.now(),
            nullable=False,
            index=True,
        ),
    )
    op.create_index(
        "ix_group_messages_group_created", "group_messages", ["group_id", "created_at"]
    )


def downgrade() -> None:
    """Drop group chat tables."""
    op.drop_index("ix_group_messages_group_created", table_name="group_messages")
    op.drop_table("group_messages")
    op.drop_index("ix_group_members_group_user", table_name="group_members")
    op.drop_table("group_members")
    op.drop_table("group_chats")
