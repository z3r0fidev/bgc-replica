"""partition_status_updates

Partitions status_updates by RANGE (created_at), following the same shape
as the Dec 2025 messages migration (20251220_partition_messages) but
correctly this time - preserving the author_id/group_id FK constraints
that migration accidentally dropped on messages (see the
i3j4k5l6m7n8 investigation for that finding; status_updates never had
this specific bug since it was never partitioned at all until now, but
worth not repeating the mistake).

KNOWN, UNAVOIDABLE TRADEOFF: post_comments.post_id FKs to status_updates.id
alone. Postgres requires every unique constraint on a partitioned table -
not just the primary key - to include the partitioning column
(FeatureNotSupportedError: "unique constraint on partitioned table must
include all partitioning columns", confirmed empirically). A composite PK
(id, created_at) does NOT give a standalone unique constraint on id, and
Postgres will not allow adding one, so post_comments.post_id CANNOT keep a
DB-level FOREIGN KEY to status_updates.id after this migration - it is
structurally impossible, not an oversight. Discussed with the user, who
explicitly accepted this tradeoff: ORM-level cascade already exists
(StatusUpdate.comments relationship has cascade="all, delete-orphan" in
backend/app/models/community.py) and remains the only enforcement
mechanism going forward. A raw SQL delete of a status_update that bypasses
the ORM would now orphan its post_comments rows - same class of risk this
issue already accepted for messages' own FK history, just for a different
underlying reason (there, DB-level FKs were accidentally dropped and can be
restored; here, Postgres itself forbids restoring one).

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-07-14 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "j4k5l6m7n8o9"
down_revision: Union[str, None] = "i3j4k5l6m7n8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # post_comments.post_id references status_updates.id; must drop this FK
    # before dropping the old table, and (per module docstring) cannot be
    # recreated at the DB level afterward - Postgres won't allow a
    # standalone UNIQUE(id) on a partitioned table.
    op.execute(
        "ALTER TABLE post_comments DROP CONSTRAINT post_comments_post_id_fkey;"
    )

    op.rename_table("status_updates", "status_updates_old")

    op.execute("""
        CREATE TABLE status_updates (
            id UUID NOT NULL,
            author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
            content VARCHAR(280) NOT NULL,
            image_url VARCHAR(1024),
            report_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
    """)

    op.execute(
        "CREATE TABLE status_updates_default PARTITION OF status_updates DEFAULT;"
    )

    op.execute(
        "SELECT create_monthly_partition('status_updates', CURRENT_DATE);"
    )
    op.execute(
        "SELECT create_monthly_partition('status_updates', "
        "(CURRENT_DATE + INTERVAL '1 month')::date);"
    )

    op.execute("INSERT INTO status_updates SELECT * FROM status_updates_old;")
    op.drop_table("status_updates_old")

    op.create_index(
        "ix_status_updates_author_id", "status_updates", ["author_id"], if_not_exists=True
    )
    op.create_index(
        "ix_status_updates_group_id", "status_updates", ["group_id"], if_not_exists=True
    )
    op.create_index(
        "ix_status_updates_created_at", "status_updates", ["created_at"], if_not_exists=True
    )
    op.create_index(
        "ix_status_updates_report_count",
        "status_updates",
        ["report_count"],
        if_not_exists=True,
    )
    op.create_index(
        "ix_status_updates_created_at_brin",
        "status_updates",
        ["created_at"],
        postgresql_using="brin",
        if_not_exists=True,
    )


def downgrade() -> None:
    op.rename_table("status_updates", "status_updates_partitioned")
    op.execute("""
        CREATE TABLE status_updates (
            id UUID PRIMARY KEY,
            author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            group_id UUID REFERENCES community_groups(id) ON DELETE CASCADE,
            content VARCHAR(280) NOT NULL,
            image_url VARCHAR(1024),
            report_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        );
    """)
    op.execute(
        "INSERT INTO status_updates "
        "(id, author_id, group_id, content, image_url, report_count, created_at) "
        "SELECT id, author_id, group_id, content, image_url, report_count, created_at "
        "FROM status_updates_partitioned;"
    )

    # Drop the old (renamed) table - and its indexes, which kept their
    # original names and would otherwise collide with the ones created
    # below - before creating anything new with those same names.
    op.execute("DROP TABLE status_updates_partitioned CASCADE;")

    op.create_index("ix_status_updates_author_id", "status_updates", ["author_id"])
    op.create_index("ix_status_updates_group_id", "status_updates", ["group_id"])
    op.create_index("ix_status_updates_created_at", "status_updates", ["created_at"])
    op.create_index(
        "ix_status_updates_report_count", "status_updates", ["report_count"]
    )
    op.create_index(
        "ix_status_updates_created_at_brin",
        "status_updates",
        ["created_at"],
        postgresql_using="brin",
    )

    # Downgrade restores a plain (non-partitioned) table, so the DB-level FK
    # from post_comments.post_id is restorable again here.
    op.execute(
        "ALTER TABLE post_comments ADD CONSTRAINT post_comments_post_id_fkey "
        "FOREIGN KEY (post_id) REFERENCES status_updates(id) ON DELETE CASCADE;"
    )
