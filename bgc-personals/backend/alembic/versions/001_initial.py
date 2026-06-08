"""Initial migration - all tables for bgc-personals

Revision ID: 001_initial
Revises:
Create Date: 2024-01-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table (for NextAuth)
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('email_verified', sa.DateTime(), nullable=True),
        sa.Column('image', sa.String(length=1024), nullable=True),
        sa.Column('hashed_password', sa.String(length=1024), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=False, default=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_is_active', 'users', ['is_active'])
    op.create_index('ix_users_metadata_gin', 'users', ['metadata_json'], postgresql_using='gin')

    # Accounts table (for NextAuth OAuth)
    op.create_table('accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(length=255), nullable=False),
        sa.Column('provider_account_id', sa.String(length=255), nullable=False),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.Integer(), nullable=True),
        sa.Column('token_type', sa.String(length=255), nullable=True),
        sa.Column('scope', sa.String(length=255), nullable=True),
        sa.Column('id_token', sa.Text(), nullable=True),
        sa.Column('session_state', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_accounts_user_id', 'accounts', ['user_id'])
    op.create_index('ix_accounts_provider_provider_account_id', 'accounts', ['provider', 'provider_account_id'], unique=True)

    # Sessions table (for NextAuth)
    op.create_table('sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_token', sa.String(length=1024), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('expires', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_sessions_session_token', 'sessions', ['session_token'], unique=True)
    op.create_index('ix_sessions_user_id', 'sessions', ['user_id'])
    op.create_index('ix_sessions_expires', 'sessions', ['expires'])

    # Verification tokens table (for NextAuth)
    op.create_table('verification_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('identifier', sa.String(length=255), nullable=False),
        sa.Column('token', sa.String(length=1024), nullable=False),
        sa.Column('expires', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_verification_tokens_token', 'verification_tokens', ['token'], unique=True)

    # Profiles table
    op.create_table('profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('height', sa.String(length=50), nullable=True),
        sa.Column('weight', sa.Integer(), nullable=True),
        sa.Column('ethnicity', sa.String(length=100), nullable=True),
        sa.Column('body_type', sa.String(length=100), nullable=True),
        sa.Column('roles', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('interests', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('location_city', sa.String(length=255), nullable=True),
        sa.Column('location_state', sa.String(length=255), nullable=True),
        sa.Column('location_lat', sa.Float(), nullable=True),
        sa.Column('location_lng', sa.Float(), nullable=True),
        sa.Column('privacy_level', sa.String(length=50), nullable=False, default='PUBLIC'),
        sa.Column('position', sa.String(length=100), nullable=True),
        sa.Column('build', sa.String(length=100), nullable=True),
        sa.Column('hiv_status', sa.String(length=100), nullable=True),
        sa.Column('privacy_mode', sa.String(length=50), nullable=False, default='OUT'),
        sa.Column('is_trans_interested', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_personal', sa.Boolean(), nullable=False, default=False),
        sa.Column('display_name', sa.String(length=255), nullable=True),
        sa.Column('pronouns', sa.String(length=50), nullable=True),
        sa.Column('birthdate', sa.Date(), nullable=True),
        sa.Column('gender_identity', sa.String(length=100), nullable=True),
        sa.Column('relationship_status', sa.String(length=100), nullable=True),
        sa.Column('looking_for', postgresql.ARRAY(sa.String(length=100)), nullable=True),
        sa.Column('occupation', sa.String(length=255), nullable=True),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('education_level', sa.String(length=100), nullable=True),
        sa.Column('university', sa.String(length=255), nullable=True),
        sa.Column('social_links', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('privacy_settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_active', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_profiles_location_city', 'profiles', ['location_city'])
    op.create_index('ix_profiles_location_state', 'profiles', ['location_state'])
    op.create_index('ix_profiles_is_personal', 'profiles', ['is_personal'])
    op.create_index('ix_profiles_display_name', 'profiles', ['display_name'])
    op.create_index('ix_profiles_gender_identity', 'profiles', ['gender_identity'])
    op.create_index('ix_profiles_relationship_status', 'profiles', ['relationship_status'])
    op.create_index('ix_profiles_industry', 'profiles', ['industry'])
    op.create_index('ix_profiles_roles_gin', 'profiles', ['roles'], postgresql_using='gin')
    op.create_index('ix_profiles_interests_gin', 'profiles', ['interests'], postgresql_using='gin')

    # Personal posts table
    op.create_table('personal_posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_slug', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('media_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column('follow_count', sa.Integer(), nullable=False, default=0),
        sa.Column('comment_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_personal_posts_author_id', 'personal_posts', ['author_id'])
    op.create_index('ix_personal_posts_category_slug', 'personal_posts', ['category_slug'])

    # Personal post followers table
    op.create_table('personal_post_followers',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['post_id'], ['personal_posts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'post_id')
    )

    # Personal post comments table
    op.create_table('personal_post_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['personal_posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['personal_post_comments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_personal_post_comments_post_id', 'personal_post_comments', ['post_id'])
    op.create_index('ix_personal_post_comments_parent_id', 'personal_post_comments', ['parent_id'])
    op.create_index('ix_personal_post_comments_author_id', 'personal_post_comments', ['author_id'])


def downgrade() -> None:
    op.drop_table('personal_post_comments')
    op.drop_table('personal_post_followers')
    op.drop_table('personal_posts')
    op.drop_table('profiles')
    op.drop_table('verification_tokens')
    op.drop_table('sessions')
    op.drop_table('accounts')
    op.drop_table('users')
