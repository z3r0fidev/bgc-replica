"""add_2fa_fields_to_users

Revision ID: 4bf83210bf86
Revises: 8f54cf5f0ff8
Create Date: 2026-01-29 17:49:00.171746

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "4bf83210bf86"
down_revision: Union[str, Sequence[str], None] = "8f54cf5f0ff8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add 2FA fields to users table."""
    op.add_column("users", sa.Column("totp_secret", sa.String(32), nullable=True))
    op.add_column(
        "users",
        sa.Column("totp_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "users", sa.Column("backup_codes", sa.ARRAY(sa.String(20)), nullable=True)
    )


def downgrade() -> None:
    """Remove 2FA fields from users table."""
    op.drop_column("users", "backup_codes")
    op.drop_column("users", "totp_enabled")
    op.drop_column("users", "totp_secret")
