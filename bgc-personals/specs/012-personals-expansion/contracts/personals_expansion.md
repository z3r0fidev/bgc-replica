# API Contracts: Personals Expansion

## Posts API

### POST `/api/personals/posts`
Create a new personal post.

**Request Body:**
```json
{
  "category": "string",
  "content": "string (html)",
  "media_ids": ["uuid"]
}
```

### POST `/api/personals/posts/{id}/follow`
Toggle follow status.

**Response:** `{ "following": boolean, "count": integer }`

---

## Comments API

### GET `/api/personals/posts/{id}/comments`
Fetch comments. Supports `parent_id` for threading.

### POST `/api/personals/posts/{id}/comments`
Add a comment.

**Request Body:**
```json
{
  "parent_id": "uuid (optional)",
  "content": "string"
}
```

---

## Real-time Events (Socket.io)

### EVENT `new_comment`
**Room**: `post:{id}:comments`
**Payload**: `PostComment` object.
