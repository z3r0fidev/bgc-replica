"""Add gallery media and albums tables

Revision ID: a1b2c3d4e5f7
Revises: b2c3d4e5f6a7
Create Date: 2026-01-31

Spec 010 - Media Gallery & Albums
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create gallery_media table
    op.create_table(
        'gallery_media',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(10), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('thumbnail_url', sa.Text(), nullable=True),
        sa.Column('storage_path', sa.Text(), nullable=False),
        sa.Column('filename', sa.String(255), nullable=True),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('privacy', sa.String(20), server_default='PUBLIC', nullable=False),
        sa.Column('view_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.CheckConstraint("type IN ('IMAGE', 'VIDEO')", name='ck_gallery_media_type'),
        sa.CheckConstraint("privacy IN ('PUBLIC', 'FRIENDS_ONLY', 'PRIVATE')", name='ck_gallery_media_privacy'),
    )

    # Create indexes for gallery_media
    op.create_index('ix_gallery_media_user_id', 'gallery_media', ['user_id'])
    op.create_index('ix_gallery_media_privacy', 'gallery_media', ['privacy'])
    op.create_index('ix_gallery_media_created_at', 'gallery_media', ['created_at'])
    op.create_index('ix_gallery_media_user_created', 'gallery_media', ['user_id', 'created_at'])

    # Create albums table
    op.create_table(
        'albums',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cover_media_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gallery_media.id', ondelete='SET NULL'), nullable=True),
        sa.Column('privacy', sa.String(20), server_default='PUBLIC', nullable=False),
        sa.Column('share_token', sa.String(64), unique=True, nullable=True),
        sa.Column('share_expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.CheckConstraint("privacy IN ('PUBLIC', 'FRIENDS_ONLY', 'PRIVATE')", name='ck_albums_privacy'),
    )

    # Create indexes for albums
    op.create_index('ix_albums_user_id', 'albums', ['user_id'])
    op.create_index(
        'ix_albums_share_token',
        'albums',
        ['share_token'],
        postgresql_where=sa.text('share_token IS NOT NULL')
    )

    # Create album_media junction table
    op.create_table(
        'album_media',
        sa.Column('album_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('albums.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('media_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gallery_media.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('position', sa.Integer(), server_default='0', nullable=False),
        sa.Column('added_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
    )

    # Create index for album_media ordering
    op.create_index('ix_album_media_position', 'album_media', ['album_id', 'position'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_album_media_position', table_name='album_media')
    op.drop_index('ix_albums_share_token', table_name='albums')
    op.drop_index('ix_albums_user_id', table_name='albums')
    op.drop_index('ix_gallery_media_user_created', table_name='gallery_media')
    op.drop_index('ix_gallery_media_created_at', table_name='gallery_media')
    op.drop_index('ix_gallery_media_privacy', table_name='gallery_media')
    op.drop_index('ix_gallery_media_user_id', table_name='gallery_media')

    # Drop tables in reverse order
    op.drop_table('album_media')
    op.drop_table('albums')
    op.drop_table('gallery_media')
