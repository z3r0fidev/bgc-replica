# API Contracts: Media Gallery & Albums

## Media Endpoints

### POST /api/media/upload

Upload a media file (image or video).

**Request**: `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Image (JPEG, PNG, WebP, GIF ≤10MB) or Video (MP4, WebM ≤100MB) |
| privacy | string | No | "PUBLIC" (default), "FRIENDS_ONLY", "PRIVATE" |

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "type": "IMAGE",
  "url": "https://storage.supabase.co/...",
  "thumbnail_url": "https://storage.supabase.co/.../thumbs/...",
  "width": 1920,
  "height": 1080,
  "size_bytes": 245678,
  "privacy": "PUBLIC",
  "created_at": "2026-01-31T12:00:00Z"
}
```

**Errors**:
- `400`: Invalid file type or size exceeded
- `401`: Not authenticated
- `413`: File too large

---

### GET /api/media/

List current user's media (paginated).

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | int | 20 | Items per page (max 100) |
| cursor | string | null | Pagination cursor |
| type | string | null | Filter by "IMAGE" or "VIDEO" |

**Response**: `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "IMAGE",
      "url": "...",
      "thumbnail_url": "...",
      "width": 1920,
      "height": 1080,
      "privacy": "PUBLIC",
      "view_count": 42,
      "created_at": "2026-01-31T12:00:00Z"
    }
  ],
  "next_cursor": "eyJ0IjoiMjAyNi0wMS0zMCJ9",
  "total_count": 156
}
```

---

### GET /api/media/{id}

Get a single media item.

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "IMAGE",
  "url": "...",
  "thumbnail_url": "...",
  "filename": "photo.jpg",
  "mime_type": "image/jpeg",
  "width": 1920,
  "height": 1080,
  "size_bytes": 245678,
  "privacy": "PUBLIC",
  "view_count": 42,
  "created_at": "2026-01-31T12:00:00Z"
}
```

**Errors**:
- `404`: Media not found or not accessible

---

### PATCH /api/media/{id}

Update media privacy.

**Request**:
```json
{
  "privacy": "FRIENDS_ONLY"
}
```

**Response**: `200 OK` (updated media object)

---

### DELETE /api/media/{id}

Delete a media item.

**Response**: `204 No Content`

**Errors**:
- `403`: Not the owner
- `404`: Media not found

---

## Album Endpoints

### POST /api/albums/

Create a new album.

**Request**:
```json
{
  "title": "Summer Vacation 2026",
  "description": "Photos from my trip to Hawaii",
  "privacy": "PUBLIC"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Summer Vacation 2026",
  "description": "Photos from my trip to Hawaii",
  "cover_media_id": null,
  "cover_url": null,
  "privacy": "PUBLIC",
  "media_count": 0,
  "created_at": "2026-01-31T12:00:00Z"
}
```

---

### GET /api/albums/

List current user's albums.

**Response**: `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Summer Vacation 2026",
      "cover_url": "https://...",
      "privacy": "PUBLIC",
      "media_count": 24,
      "created_at": "2026-01-31T12:00:00Z"
    }
  ],
  "next_cursor": null
}
```

---

### GET /api/albums/{id}

Get album with its media.

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Summer Vacation 2026",
  "description": "Photos from my trip to Hawaii",
  "cover_url": "https://...",
  "privacy": "PUBLIC",
  "media_count": 24,
  "created_at": "2026-01-31T12:00:00Z",
  "media": [
    {
      "id": "uuid",
      "type": "IMAGE",
      "url": "...",
      "thumbnail_url": "...",
      "position": 0
    }
  ]
}
```

---

### PATCH /api/albums/{id}

Update album details.

**Request**:
```json
{
  "title": "Hawaii 2026",
  "cover_media_id": "uuid",
  "privacy": "FRIENDS_ONLY"
}
```

**Response**: `200 OK` (updated album)

---

### DELETE /api/albums/{id}

Delete an album (media items are NOT deleted).

**Response**: `204 No Content`

---

### POST /api/albums/{id}/media

Add media to an album.

**Request**:
```json
{
  "media_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response**: `200 OK`
```json
{
  "added_count": 3,
  "album_media_count": 27
}
```

---

### DELETE /api/albums/{id}/media/{media_id}

Remove media from album.

**Response**: `204 No Content`

---

### POST /api/albums/{id}/share

Generate a share link for the album.

**Request**:
```json
{
  "expires_in_days": 7
}
```

**Response**: `200 OK`
```json
{
  "share_url": "https://bgclive.app/shared/album/abc123xyz",
  "share_token": "abc123xyz",
  "expires_at": "2026-02-07T12:00:00Z"
}
```

---

### GET /api/albums/shared/{token}

Access a shared album (no auth required).

**Response**: `200 OK` (album with media, same as GET /api/albums/{id})

**Errors**:
- `404`: Invalid or expired token

---

## Public Gallery Endpoint

### GET /api/users/{user_id}/gallery

Get public gallery for a user (privacy-filtered).

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | int | 20 | Items per page |
| cursor | string | null | Pagination cursor |

**Response**: `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "IMAGE",
      "url": "...",
      "thumbnail_url": "..."
    }
  ],
  "next_cursor": "...",
  "total_count": 45
}
```

Only returns:
- PUBLIC items (always)
- FRIENDS_ONLY items (if viewer is a friend)
- PRIVATE items (never, only visible to owner via /api/media/)
