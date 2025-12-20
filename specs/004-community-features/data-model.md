# Data Model: Community Features

## Forum Models (SQLAlchemy)

### ForumCategory
Logical containers for threads (e.g., "Health", "Events").

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| name | String | unique, index| e.g., "Health Education" |
| slug | String | unique | URL-friendly name |
| description | String | | Purpose of the category |

### ForumThread
The starting post of a discussion.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| category_id | UUID | ForeignKey | Parent category |
| author_id | UUID | ForeignKey | Creator |
| title | String | | Thread subject |
| content | Text | | Initial post body |
| media_url | String | nullable | Optional image attachment |
| report_count | Integer | default=0 | Number of flags |
| created_at | DateTime | | Creation date |
| last_activity | DateTime | index | Updated on new reply |

### ForumPost
A reply to a thread or another post.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| thread_id | UUID | ForeignKey | Root thread |
| parent_id | UUID | ForeignKey | Self-referential parent (nullable) |
| author_id | UUID | ForeignKey | Creator |
| content | Text | | Post body |
| media_url | String | nullable | Optional image attachment |
| report_count | Integer | default=0 | Number of flags |
| created_at | DateTime | | Creation date |

## Feed Models

### StatusUpdate
Short post in the social feed.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| author_id | UUID | ForeignKey | Creator |
| content | String(280) | | Text body |
| image_url | String | nullable | Optional image attachment |
| report_count | Integer | default=0 | Number of flags |
| created_at | DateTime | | Creation date |

### PostComment
Response to a status update.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| post_id | UUID | ForeignKey | Target status update |
| author_id | UUID | ForeignKey | Creator |
| content | Text | | Reply text |
| created_at | DateTime | | Creation date |

## Group Models

### CommunityGroup
User-led sub-community.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| name | String | unique | Group name |
| description | Text | | About the group |
| owner_id | UUID | ForeignKey | Creator/Admin |
| is_private | Boolean | default=False | Invite-only flag |
| created_at | DateTime | | Creation date |

### GroupMembership
User-Group relationship.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| user_id | UUID | ForeignKey | Member |
| group_id | UUID | ForeignKey | Group |
| role | String | default="MEMBER"| OWNER, MODERATOR, MEMBER |

## Moderation Models

### ContentReport
Flagging records.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| reporter_id | UUID | ForeignKey | User who flagged |
| content_type | String | | THREAD, POST, STATUS, COMMENT |
| content_id | UUID | | ID of the reported item |
| reason | String | | e.g., SPAM, HARASSMENT |
| reviewed_by | UUID | nullable | Admin ID |
| status | String | default="PENDING"| PENDING, RESOLVED, DISMISSED |

## Redis Feed Schema

- **Global Feed**: `feed:global` (ZSET)
  - Member: `post_id`
  - Score: `unix_timestamp`
- **User Feed**: `feed:user:{user_id}` (ZSET)
  - Member: `post_id`
  - Score: `unix_timestamp`
