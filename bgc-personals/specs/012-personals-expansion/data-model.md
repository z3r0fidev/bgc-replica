# Data Model: Personals Section Expansion

## New Entities

### PersonalPost
Extends the forum/personals structure.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| author_id | UUID | FK to Users |
| category_slug | String | e.g. "transx" |
| content | Text | HTML from Tiptap |
| media_ids | UUID[] | FKs to Media table |
| follow_count | Integer | Denormalized count for performance |
| comment_count | Integer | Denormalized count for performance |
| created_at | DateTime | |

### PostFollower
Join table for follow status.

| Field | Type | Description |
|-------|------|-------------|
| user_id | UUID | FK to Users |
| post_id | UUID | FK to PersonalPost |
| created_at | DateTime | |

### PostComment
Threaded comments.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary Key |
| post_id | UUID | FK to PersonalPost |
| parent_id | UUID | Optional FK to PostComment (nesting) |
| author_id | UUID | FK to Users |
| content | Text | Plain text or basic HTML |
| created_at | DateTime | |

## Relationships
- **User (1) <-> (N) PersonalPost**
- **PersonalPost (1) <-> (N) Media**
- **PersonalPost (1) <-> (N) PostComment**
- **User (N) <-> (N) PersonalPost** (via PostFollower)
