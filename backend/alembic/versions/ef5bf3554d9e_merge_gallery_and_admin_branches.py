"""merge_gallery_and_admin_branches

Revision ID: ef5bf3554d9e
Revises: a1b2c3d4e5f7, c3d4e5f6a7b8
Create Date: 2026-02-06 21:33:40.345294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ef5bf3554d9e'
down_revision: Union[str, Sequence[str], None] = ('a1b2c3d4e5f7', 'c3d4e5f6a7b8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
