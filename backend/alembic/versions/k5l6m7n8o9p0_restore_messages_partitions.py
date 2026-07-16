"""restore_messages_partitions

Restores messages_default (and creates a current + next-month partition),
which 96be264b314b (add_created_at_to_profile, 2025-12-21 - the very next
migration after 20251220_partition_messages) dropped as an unreviewed
autogenerate side effect: alembic's autogenerate diffed the SQLAlchemy
metadata against the DB, correctly re-added the FK constraints/
ix_messages_sender_id that the Dec 2025 migration's raw-SQL upgrade() had
omitted, but it also does not understand native Postgres partitions - it
saw messages_default/messages_y2025m12 as tables absent from the ORM
metadata and emitted op.drop_table() for both. Nobody caught it in review.

Confirmed by running the full migration chain from scratch against a clean
Postgres 17 instance: messages ends up PARTITION BY RANGE with zero
partitions attached anywhere - not even a default - in every environment,
production included (verified directly against production 2026-07-15, same
zero-partition state, alembic_version already at head). Any INSERT into
messages currently fails with "no partition of relation messages found for
row"; it has been silently unwritable since 2025-12-21, undetected because
production has had zero real users/messages so far.

status_updates doesn't have this problem - j4k5l6m7n8o9 (partition_status_
updates) creates its default and current/next-month partitions inline in
the same migration that partitions it, so there was no gap for a later
migration to autogenerate over.

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-07-15 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "k5l6m7n8o9p0"
down_revision: Union[str, None] = "j4k5l6m7n8o9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TABLE IF NOT EXISTS messages_default PARTITION OF messages DEFAULT;")
    op.execute("SELECT create_monthly_partition('messages', CURRENT_DATE);")
    op.execute(
        "SELECT create_monthly_partition('messages', "
        "(CURRENT_DATE + INTERVAL '1 month')::date);"
    )


def downgrade() -> None:
    # Deliberately not dropping these: with live rows present, dropping
    # messages_default would fail outright (or silently discard rows if
    # forced); with no rows, dropping it just re-introduces the exact
    # unwritable-table bug this migration exists to fix. If a genuine
    # rollback of messages partitioning is ever needed, use
    # backend/docs/runbooks/partition-rollback.md instead, which downgrades
    # the whole partitioned structure back to a plain table deliberately.
    pass
