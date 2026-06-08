"""add_notification_preferences_to_users

Revision ID: 5e91d72c83a1
Revises: 4bf83210bf86
Create Date: 2026-01-29 19:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "5e91d72c83a1"
down_revision: Union[str, Sequence[str], None] = "4bf83210bf86"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add notification_preferences JSONB field to users table."""
    op.add_column("users", sa.Column("notification_preferences", JSONB, nullable=True))


def downgrade() -> None:
    """Remove notification_preferences from users table."""
    op.drop_column("users", "notification_preferences")
