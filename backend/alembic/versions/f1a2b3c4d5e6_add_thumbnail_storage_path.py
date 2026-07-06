"""Add thumbnail_storage_path to gallery_media

Revision ID: f1a2b3c4d5e6
Revises: ef5bf3554d9e
Create Date: 2026-07-05

Issue #71 - Delete thumbnails when media is deleted
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "ef5bf3554d9e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add thumbnail_storage_path column to gallery_media table."""
    op.add_column(
        "gallery_media",
        sa.Column("thumbnail_storage_path", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Remove thumbnail_storage_path column from gallery_media table."""
    op.drop_column("gallery_media", "thumbnail_storage_path")
