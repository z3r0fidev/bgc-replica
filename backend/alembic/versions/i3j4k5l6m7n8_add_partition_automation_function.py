"""add_partition_automation_function

Adds create_monthly_partition(target_table, target_date), a generic
PL/pgSQL function for creating monthly range partitions. Table name is
allowlisted (interpolated via format(%I, ...) elsewhere) rather than fully
dynamic, so a typo or unexpected caller can't partition an arbitrary table.

No per-partition index DDL - indexes created once on a partitioned parent
propagate automatically to every current and future partition (Postgres 11+),
so ix_messages_conversation_created/ix_messages_room_created/the BRIN
indexes already cover any partition this function creates.

SQL lives in app.core.partitioning so this migration and the test fixture
(backend/tests/conftest.py) share one source of truth rather than the
fixture reimplementing this function's definition separately.

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-07-14 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

from app.core.partitioning import (
    CREATE_MONTHLY_PARTITION_FUNCTION_SQL,
    DROP_MONTHLY_PARTITION_FUNCTION_SQL,
)

# revision identifiers, used by Alembic.
revision: str = "i3j4k5l6m7n8"
down_revision: Union[str, None] = "h2i3j4k5l6m7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(CREATE_MONTHLY_PARTITION_FUNCTION_SQL)


def downgrade() -> None:
    op.execute(DROP_MONTHLY_PARTITION_FUNCTION_SQL)
