# API Rate Limiting

## Overview

All API endpoints are protected by rate limiting using Redis-backed `fastapi-limiter`. Rate limits are applied per IP address and help prevent abuse while ensuring fair access for all users.

## Rate Limit Tiers

### Authentication Endpoints

| Endpoint | Limit | Period | Description |
|----------|-------|--------|-------------|
| `POST /api/auth/register` | 3 | 1 hour | Account registration |
| `POST /api/auth/login` | 5 | 60 sec | Login attempts |
| `POST /api/auth/login/2fa` | 5 | 60 sec | 2FA verification |
| `POST /api/auth/logout` | 1 | 60 sec | Session termination |
| `POST /api/auth/forgot-password` | 3 | 1 hour | Password reset requests |

### Admin Endpoints

#### Read Operations (30 requests / 60 seconds)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - User list with search/filter
- `GET /api/admin/users/{id}` - User details
- `GET /api/admin/action-logs` - Audit trail
- `GET /api/admin/analytics/overview` - Analytics overview
- `GET /api/admin/analytics/users` - User growth metrics
- `GET /api/admin/analytics/engagement` - Engagement metrics
- `GET /api/admin/health` - System health status
- `GET /api/admin/health/database` - Database metrics
- `GET /api/admin/health/redis` - Redis metrics
- `GET /api/admin/health/cache` - Cache hit ratios and key statistics

#### Write Operations (10 requests / 60 seconds)
- `PATCH /api/admin/users/{id}` - Update user details

#### Sensitive Operations (5 requests / 60 seconds)
- `POST /api/admin/users/{id}/suspend` - Suspend user
- `POST /api/admin/users/{id}/ban` - Ban user
- `POST /api/admin/users/{id}/restore` - Restore user
- `POST /api/admin/users/{id}/make-admin` - Grant admin privileges
- `POST /api/admin/users/{id}/revoke-admin` - Revoke admin privileges

### User-Facing Endpoints

| Category | Limit | Period |
|----------|-------|--------|
| Search | 30 | 60 sec |
| Profile updates | 10 | 60 sec |
| Media uploads | 20 | 60 sec |
| Chat messages | 20 | 60 sec |
| Forum posts | 10 | 60 sec |
| Forum comments | 10 | 60 sec |

## Response Headers

All responses include rate limit information:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when the limit resets |

Example:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1707235200
```

## Rate Limit Exceeded Response

When a rate limit is exceeded, the API returns:

**Status Code:** `429 Too Many Requests`

**Response Body:**
```json
{
  "detail": "Rate limit exceeded"
}
```

**Headers:**
```
Retry-After: 45
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707235200
```

## Best Practices for API Consumers

### 1. Implement Exponential Backoff
When receiving a 429 response, wait before retrying:
```python
import time
import random

def make_request_with_backoff(url, max_retries=5):
    for attempt in range(max_retries):
        response = requests.get(url)
        if response.status_code != 429:
            return response

        wait_time = (2 ** attempt) + random.uniform(0, 1)
        time.sleep(wait_time)

    raise Exception("Max retries exceeded")
```

### 2. Cache Responses
Reduce API calls by caching responses client-side:
- Dashboard stats: Cache for 30 seconds
- User lists: Cache for 60 seconds
- Health status: Cache for 10 seconds

### 3. Use Batch Operations
When available, prefer batch endpoints over individual requests:
- Use `/api/comments/batch` instead of multiple single comment fetches
- Use search with filters instead of fetching all then filtering

### 4. Monitor Rate Limit Headers
Track `X-RateLimit-Remaining` to proactively slow down before hitting limits.

### 5. Spread Requests Over Time
For background jobs, distribute requests evenly rather than bursting:
```python
# Bad: 100 requests instantly
for user in users:
    fetch_user(user.id)

# Good: 100 requests over 60 seconds
for i, user in enumerate(users):
    if i > 0 and i % 30 == 0:
        time.sleep(60)
    fetch_user(user.id)
```

## Graceful Degradation

If Redis is unavailable, the API operates without rate limiting to maintain availability. This is logged as a warning:

```
WARNING: Rate limiting is disabled - Redis connection failed
```

## Testing Rate Limits

To test rate limiting behavior:

```bash
# Trigger rate limit (will fail after 5 requests)
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done
```

## Configuration

Rate limits are defined per-endpoint using the `RateLimiter` dependency:

```python
from fastapi_limiter.depends import RateLimiter

@router.get(
    "/stats",
    dependencies=[Depends(RateLimiter(times=30, seconds=60))],
)
async def get_stats():
    ...
```

Rate limit configuration is not exposed via environment variables to prevent misconfiguration. Changes require code modification and deployment.
