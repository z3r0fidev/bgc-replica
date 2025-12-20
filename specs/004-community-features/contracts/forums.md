# API Contracts: Forums

## Categories

### GET `/api/forums/categories`
List all forum categories.
- **Response**: `List[ForumCategorySchema]`

## Threads

### GET `/api/forums/categories/{category_slug}/threads`
List threads within a category.
- **Query Params**: `limit`, `offset`.
- **Response**: `List[ForumThreadSchema]`

### POST `/api/forums/threads`
Create a new discussion thread.
- **Request**: `{"category_id": "uuid", "title": "string", "content": "string", "image_url": "optional"}`
- **Response**: `ForumThreadSchema`

## Posts (Replies)

### GET `/api/forums/threads/{thread_id}/posts`
Retrieve the threaded posts for a discussion.
- **Response**: `List[ForumPostSchema]` (Nested hierarchy supported)

### POST `/api/forums/posts`
Reply to a thread or another post.
- **Request**: `{"thread_id": "uuid", "parent_id": "optional_uuid", "content": "string", "image_url": "optional"}`
- **Response**: `ForumPostSchema`
