# Contracts: Performance Headers

## Static Community Assets (Edge CDN)
Applies to all public URLs from `Supabase Storage`.

| Header | Value | Condition |
|--------|-------|-----------|
| `Cache-Control` | `public, max-age=31536000, immutable` | Permanent files |
| `ETag` | `{hash}` | Generated on upload |
| `X-Edge-Cache` | `HIT` | Desired state for regional requests |

## API Responses (Social Feed)
Applies to `/api/feed/*`.

| Header | Value | Description |
|--------|-------|-------------|
| `Cache-Control` | `no-cache, no-store, must-revalidate` | Origin always returns latest |
| `X-Service-Worker` | `SWR-Trigger` | Custom signal for background revalidation |
| `Vary` | `Authorization` | Prevents cross-user feed leak in proxies |
