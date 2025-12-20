# Contracts: PWA Event Handlers

## Deep-Link Logic
Handled in `src/app/pwa-handler/route.ts`.

| Input | Logic | Output |
|-------|-------|--------|
| `web+bgclive://profile/{id}` | Validate UUID | Redirect to `/(protected)/users/{id}` |
| `web+bgclive://thread/{id}` | Validate UUID | Redirect to `/(protected)/forums/thread/{id}` |

## Share-Target Logic
Handled in `POST /api/feed/share`.

| Field | Handler | Result |
|-------|---------|--------|
| `title` | Concat to `text` | Status Update Body |
| `files` | Auto-upload to storage | `image_url` metadata |
| `response` | HTTP 303 | Redirect to `/feed` |
