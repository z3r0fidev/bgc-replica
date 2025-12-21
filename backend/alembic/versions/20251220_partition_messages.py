"""partition_messages

Revision ID: 20251220_partition_msg
Revises: 20251220_add_gin_brin
Create Date: 2025-12-20 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20251220_partition_msg'
down_revision: Union[str, Sequence[str], None] = '20251220_add_gin_brin'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Rename existing messages table
    op.rename_table('messages', 'messages_old')
    
    # 2. Create partitioned messages table
    # Note: Partitioned tables must include the partition key in the primary key
    op.execute("""
        CREATE TABLE messages (
            id UUID NOT NULL,
            room_id UUID,
            conversation_id UUID,
            sender_id UUID NOT NULL,
            content TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'TEXT',
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
    """)
    
    # 3. Create default partition
    op.execute("CREATE TABLE messages_default PARTITION OF messages DEFAULT;")
    
    # 4. Create current month partition (December 2025)
    op.execute("""
        CREATE TABLE messages_y2025m12 PARTITION OF messages
        FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
    """)
    
    # 5. Migrate data if any
    op.execute("INSERT INTO messages SELECT * FROM messages_old;")
    
    # 6. Drop old table
    op.drop_table('messages_old')

def downgrade() -> None:
    # Reverse logic
    op.rename_table('messages', 'messages_partitioned')
    op.execute("""
        CREATE TABLE messages (
            id UUID PRIMARY KEY,
            room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'TEXT',
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        );
    """)
    op.execute("INSERT INTO messages (id, room_id, conversation_id, sender_id, content, type, created_at) SELECT id, room_id, conversation_id, sender_id, content, type, created_at FROM messages_partitioned;")
    op.execute("DROP TABLE messages_partitioned CASCADE;")
