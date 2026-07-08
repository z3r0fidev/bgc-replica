"""Add GIN/BRIN indexes for search optimization

Revision ID: g1h2i3j4k5l6
Revises: ef5bf3554d9e
Create Date: 2026-07-05

Issue #69 - GIN indexes for JSONB/Array columns, BRIN for time-series
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add GIN indexes for JSONB/Array columns and BRIN indexes for time-series."""

    # ============ GIN Indexes (JSONB/Array) ============

    # GIN index on profiles.looking_for (Array<String>)
    # Enables fast containment queries: WHERE looking_for @> ARRAY['dating']
    op.create_index(
        "ix_profiles_looking_for_gin",
        "profiles",
        ["looking_for"],
        unique=False,
        postgresql_using="gin",
    )

    # GIN index on profiles.social_links (JSONB)
    # Enables fast key existence and containment queries:
    # WHERE social_links ? 'instagram' or WHERE social_links @> '{"twitter": "handle"}'
    op.create_index(
        "ix_profiles_social_links_gin",
        "profiles",
        ["social_links"],
        unique=False,
        postgresql_using="gin",
    )

    # ============ BRIN Indexes (Time-Series) ============

    # BRIN index on messages.created_at
    # Efficient for time-range queries on naturally ordered data
    # Much smaller than B-tree for large tables with sequential inserts
    op.create_index(
        "ix_messages_created_at_brin",
        "messages",
        ["created_at"],
        unique=False,
        postgresql_using="brin",
    )

    # BRIN index on status_updates.created_at
    # Feed posts are inserted chronologically, ideal for BRIN
    op.create_index(
        "ix_status_updates_created_at_brin",
        "status_updates",
        ["created_at"],
        unique=False,
        postgresql_using="brin",
    )


def downgrade() -> None:
    """Remove GIN and BRIN indexes."""
    op.drop_index("ix_status_updates_created_at_brin", table_name="status_updates")
    op.drop_index("ix_messages_created_at_brin", table_name="messages")
    op.drop_index("ix_profiles_social_links_gin", table_name="profiles")
    op.drop_index("ix_profiles_looking_for_gin", table_name="profiles")
