# Data Model: Community Forums Re-Design

## Updated Entities

### ForumCategory
Supports hierarchical nesting.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| name | String | Display name |
| slug | String | URL slug |
| parent_id | UUID (FK) | Reference to parent `ForumCategory.id` |
| icon_path | String (Optional) | Icon for tree navigation |
| banner_path | String (Optional) | Themed header banner |

### ForumThread
Added view tracking and metadata.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| category_id | UUID (FK) | Reference to `ForumCategory` |
| title | String | Thread subject |
| author_id | UUID (FK) | Reference to `User` |
| view_count | Integer | Total views (atomic increment) |
| reply_count | Integer | Total replies (persisted in DB) |
| is_sticky | Boolean | Pinned at top of list |
| last_activity_at | DateTime | For sorting |

## Logical Stats (Redis)

| Key | Structure | Description |
|-----|-----------|-------------|
| `forum:{id}:active_users` | Set | List of unique `user_id`s currently in the sub-forum |
| `thread:{id}:reply_count` | Counter | Total number of posts in thread |

## Relationships
- **ForumCategory (1) <-> (N) ForumCategory**: Parent/child self-reference.
- **ForumCategory (1) <-> (N) ForumThread**: Threads belong to categories.
- **ForumThread (1) <-> (N) ForumPost**: Posts belong to threads.
