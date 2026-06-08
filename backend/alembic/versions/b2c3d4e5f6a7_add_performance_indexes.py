"""add_performance_indexes

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-29 22:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance-optimizing indexes."""

    # ============ Conversations ============
    # Composite index for finding conversations between two users
    op.create_index(
        "ix_conversations_users_pair",
        "conversations",
        ["user_one_id", "user_two_id"],
        unique=False,
    )
    # Index for sorting by last message
    op.create_index(
        "ix_conversations_last_message_at",
        "conversations",
        ["last_message_at"],
        unique=False,
    )

    # ============ Messages ============
    # Composite index for conversation message listing (most common query)
    op.create_index(
        "ix_messages_conversation_created",
        "messages",
        ["conversation_id", "created_at"],
        unique=False,
    )
    # Composite index for room message listing
    op.create_index(
        "ix_messages_room_created", "messages", ["room_id", "created_at"], unique=False
    )

    # ============ Profiles ============
    # Partial index for active personals (is_personal = true)
    op.create_index(
        "ix_profiles_personal_active",
        "profiles",
        ["last_active"],
        unique=False,
        postgresql_where=sa.text("is_personal = true"),
    )
    # Composite index for discovery queries
    op.create_index(
        "ix_profiles_discovery",
        "profiles",
        ["location_state", "location_city", "last_active"],
        unique=False,
    )
    # Composite for verified profile discovery
    op.create_index(
        "ix_profiles_verified_active",
        "profiles",
        ["is_verified", "last_active"],
        unique=False,
        postgresql_where=sa.text("is_verified = true"),
    )

    # ============ Relationships ============
    # Index for finding all blocked relationships quickly
    op.create_index(
        "ix_relationships_blocked",
        "relationships",
        ["from_user_id", "to_user_id"],
        unique=False,
        postgresql_where=sa.text("type = 'BLOCKED'"),
    )
    # Index for finding all friends
    op.create_index(
        "ix_relationships_friends",
        "relationships",
        ["from_user_id", "to_user_id", "status"],
        unique=False,
        postgresql_where=sa.text("type = 'FRIEND'"),
    )

    # ============ Forum Threads ============
    # Composite index for category + activity (most common listing)
    op.create_index(
        "ix_forum_threads_category_activity",
        "forum_threads",
        ["category_id", "last_activity"],
        unique=False,
    )

    # ============ Forum Posts ============
    # Composite index for thread posts listing
    op.create_index(
        "ix_forum_posts_thread_created",
        "forum_posts",
        ["thread_id", "created_at"],
        unique=False,
    )

    # ============ Content Reports ============
    # Index for pending reports (admin queue)
    op.create_index(
        "ix_content_reports_pending",
        "content_reports",
        ["status", "created_at"],
        unique=False,
        postgresql_where=sa.text("status = 'PENDING'"),
    )

    # ============ Auth Logs ============
    # Index for recent failed logins (brute force detection)
    op.create_index(
        "ix_auth_logs_failed_logins",
        "auth_logs",
        ["ip_address", "created_at"],
        unique=False,
        postgresql_where=sa.text("action = 'login_failed'"),
    )

    # ============ Sessions ============
    # Composite index for user session listing
    op.create_index(
        "ix_sessions_user_created", "sessions", ["user_id", "created_at"], unique=False
    )

    # ============ Group Chats ============
    # Index for active group chats
    op.create_index(
        "ix_group_chats_active_recent",
        "group_chats",
        ["is_active", "last_message_at"],
        unique=False,
        postgresql_where=sa.text("is_active = true"),
    )

    # ============ Group Messages ============
    # BRIN index for time-series group messages
    op.create_index(
        "ix_group_messages_created_brin",
        "group_messages",
        ["created_at"],
        unique=False,
        postgresql_using="brin",
    )


def downgrade() -> None:
    """Remove performance indexes."""
    op.drop_index("ix_group_messages_created_brin", table_name="group_messages")
    op.drop_index("ix_group_chats_active_recent", table_name="group_chats")
    op.drop_index("ix_sessions_user_created", table_name="sessions")
    op.drop_index("ix_auth_logs_failed_logins", table_name="auth_logs")
    op.drop_index("ix_content_reports_pending", table_name="content_reports")
    op.drop_index("ix_forum_posts_thread_created", table_name="forum_posts")
    op.drop_index("ix_forum_threads_category_activity", table_name="forum_threads")
    op.drop_index("ix_relationships_friends", table_name="relationships")
    op.drop_index("ix_relationships_blocked", table_name="relationships")
    op.drop_index("ix_profiles_verified_active", table_name="profiles")
    op.drop_index("ix_profiles_discovery", table_name="profiles")
    op.drop_index("ix_profiles_personal_active", table_name="profiles")
    op.drop_index("ix_messages_room_created", table_name="messages")
    op.drop_index("ix_messages_conversation_created", table_name="messages")
    op.drop_index("ix_conversations_last_message_at", table_name="conversations")
    op.drop_index("ix_conversations_users_pair", table_name="conversations")
