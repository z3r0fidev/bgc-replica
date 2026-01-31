"""add_verification_badges

Revision ID: a1b2c3d4e5f6
Revises: 9f2b83cd41a7
Create Date: 2026-01-29 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9f2b83cd41a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add verification badge fields to profiles table."""
    op.add_column('profiles', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('profiles', sa.Column('verified_at', sa.DateTime(), nullable=True))
    op.add_column('profiles', sa.Column('verification_type', sa.String(50), nullable=True))
    op.add_column('profiles', sa.Column('verification_notes', sa.String(500), nullable=True))

    # Index for verified profiles
    op.create_index('ix_profiles_is_verified', 'profiles', ['is_verified'])


def downgrade() -> None:
    """Remove verification badge fields."""
    op.drop_index('ix_profiles_is_verified', table_name='profiles')
    op.drop_column('profiles', 'verification_notes')
    op.drop_column('profiles', 'verification_type')
    op.drop_column('profiles', 'verified_at')
    op.drop_column('profiles', 'is_verified')
