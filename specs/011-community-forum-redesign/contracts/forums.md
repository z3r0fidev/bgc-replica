# API Contracts: Community Forums Re-Design

## Navigation API

### GET `/api/forums/tree`
Fetch the complete hierarchical category tree.

**Response:**
```json
[
  {
    "id": "...",
    "name": "General",
    "slug": "general",
    "icon": "/icons/general.png",
    "children": [
      { "id": "...", "name": "Introductions", "slug": "intro" },
      { "id": "...", "name": "Off-Topic", "slug": "off-topic" }
    ]
  },
  ...
]
```

---

## Threads API

### GET `/api/forums/categories/{slug}/threads`
Fetch high-density thread list for a specific category.

**Query Parameters:**
- `limit`: integer (default: 20)
- `cursor`: string (pagination)

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "title": "Welcome to the new Philly forum!",
      "author": { "name": "Admin", "avatar": "..." },
      "stats": { "replies": 15, "views": 120 },
      "last_post": {
        "user": { "name": "User1", "avatar": "..." },
        "created_at": "2025-12-23T10:00:00Z"
      },
      "is_sticky": true,
      "is_hot": false
    }
  ],
  "metadata": { "has_next": true, "next_cursor": "..." }
}
```

---

## Real-time Events (Socket.io)

### EVENT `join_forum`
**Data**: `{ "forum_id": "UUID" }`
**Action**: Client joins forum room; server updates Redis active set.

### EVENT `forum_stats_update`
**Data**: `{ "forum_id": "UUID", "active_users": 12 }`
**Action**: Server broadcasts room occupancy to all clients in the room.
