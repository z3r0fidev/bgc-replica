# Data Model: Real-Time Chat & Messaging

## SQLAlchemy Models (PostgreSQL)

### Message
Stores persistent chat history for DMs and Rooms.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| room_id | UUID | index, nullable | ID of the ChatRoom (null for DMs) |
| conversation_id | UUID | index, nullable | ID of the DM Conversation (null for Rooms) |
| sender_id | UUID | ForeignKey | The user who sent the message |
| content | Text | | The message text or media metadata |
| type | String | default="TEXT" | TEXT, IMAGE, VIDEO, SYSTEM |
| created_at | DateTime | default=now() | Message timestamp |

### ChatRoom
Represents a public or private group chat.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| name | String | unique | e.g., "The Lounge" |
| description | String | | Room topic or description |
| category | String | index | e.g., "Regional", "Interests" |
| is_public | Boolean | default=True | Privacy status |
| created_at | DateTime | | Creation date |

### Conversation
Groups two users for Direct Messaging.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| user_one_id | UUID | index | First participant |
| user_two_id | UUID | index | Second participant |
| last_message_at | DateTime | | For sorting chat lists |

## Redis Schema (Transient State)

- **Presence Set**: `presence:online` (Sorted Set)
  - Member: `user_id`
  - Score: `unix_timestamp`
- **Active Rooms**: `room:{room_id}:participants` (Set)
  - Members: `user_id` list
- **Typing Indicators**: `typing:{source_id}` (String with TTL)
  - Key: `typing:{room_id}:{user_id}` or `typing:dm:{conv_id}:{user_id}`
  - TTL: 5 seconds
