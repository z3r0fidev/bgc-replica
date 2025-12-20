# Data Model: PWA & Performance Optimization

## Logical Caching Entities

### FeedCache (Redis/Client-side)
Structure for storing pre-computed feeds for instant retrieval.

| Key Pattern | Data Structure | TTL | Description |
|-------------|----------------|-----|-------------|
| `feed:global:v1` | ZSET | 1 Hour | Global feed post IDs with timestamps |
| `feed:user:{id}:v1`| ZSET | 1 Hour | Personalized follower feed |
| `pwa:offline:feed`| IDB (Browser) | 7 Days | Local storage of last 50 feed items |

### AssetMetadata (Supabase Storage)
Header configurations for Edge CDN optimization.

| Field | Value | Purpose |
|-------|-------|---------|
| `Cache-Control` | `public, max-age=31536000, immutable` | Permanent media assets |
| `Content-Type` | `image/webp` (Prefer) | Bandwidth reduction |

## PWA Integration Entities

### ProtocolHandler
Defines deep-link schemes.

| Scheme | Action URL | Context |
|--------|------------|---------|
| `web+bgclive://profile/{uuid}` | `/users/{uuid}` | Direct Profile Access |
| `web+bgclive://thread/{uuid}`  | `/forums/thread/{uuid}` | Direct Forum Access |

### ShareTarget
Input mapping from OS share sheets.

| Parameter | Type | Mapping |
|-----------|------|---------|
| `title`   | TEXT | Status Update Content |
| `text`    | TEXT | Status Update Content |
| `url`     | TEXT | Appended to Content |
| `files`   | BLOB | `image_url` upload trigger |
