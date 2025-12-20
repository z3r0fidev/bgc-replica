"""add_gin_brin_indexes

Revision ID: 20251220_add_gin_brin
Revises: None
Create Date: 2025-12-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20251220_add_gin_brin'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add GIN indexes
    op.create_index('ix_users_metadata_gin', 'users', ['metadata_json'], postgresql_using='gin')
    op.create_index('ix_profiles_roles_gin', 'profiles', ['roles'], postgresql_using='gin')
    op.create_index('ix_profiles_interests_gin', 'profiles', ['interests'], postgresql_using='gin')
    
    # Add BRIN index
    op.create_index('ix_messages_created_at_brin', 'messages', ['created_at'], postgresql_using='brin')

def downgrade() -> None:
    op.drop_index('ix_messages_created_at_brin', table_name='messages')
    op.drop_index('ix_profiles_interests_gin', table_name='profiles')
    op.drop_index('ix_profiles_roles_gin', table_name='profiles')
    op.drop_index('ix_users_metadata_gin', table_name='users')
