"""add_resolved_at_to_content_reports

Adds content_reports.resolved_at (nullable DateTime), set alongside
reviewed_by when a report is actioned via resolve_report/bulk_resolve_
reports. Fixes Issue #132: GET /api/moderation/stats's resolved_today
counted reports by created_at (filed today), not by when they were
actually resolved - a report filed yesterday and resolved today was never
counted, while a report filed and resolved today for reasons unrelated to
same-day resolution speed inflated the number.

NULL for every report resolved before this migration (no historical
resolution timestamp exists to backfill) and for still-PENDING reports -
this is intentional, not a data gap to fix: those rows simply never
contribute to any resolved_at-based stat, which is correct (we don't know
when they were actually resolved).

Revision ID: m7n8o9p0q1r2
Revises: k5l6m7n8o9p0
Create Date: 2026-07-27 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "m7n8o9p0q1r2"
down_revision: Union[str, None] = "k5l6m7n8o9p0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "content_reports",
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("content_reports", "resolved_at")
