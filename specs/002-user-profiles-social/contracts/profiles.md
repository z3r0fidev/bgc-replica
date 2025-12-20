# API Contracts: User Profiles & Social Graph

## Profiles API

### GET `/api/profiles/{id}`
Retrieve a user's profile.
- **Response**: `ProfileSchema` (includes User basic info, Media gallery, and average Rating).

### PUT `/api/profiles/me`
Update the current user's profile.
- **Request**: `ProfileUpdateSchema`.
- **Response**: `ProfileSchema`.

### POST `/api/profiles/me/media`
Upload media to gallery.
- **Request**: `Multipart/form-data` (file).
- **Response**: `MediaSchema`.

### DELETE `/api/profiles/me/media/{media_id}`
Delete a media item.

## Social API

### POST `/api/social/favorite/{user_id}`
Add a user to favorites.

### DELETE `/api/social/favorite/{user_id}`
Remove from favorites.

### POST `/api/social/friend-request/{user_id}`
Send a friend request.

### POST `/api/social/friend-request/{user_id}/accept`
Accept a friend request.

### GET `/api/social/relationships`
List all relationships (friends, pending, favorites).

## Search API

### GET `/api/search`
Search for users.
- **Query Params**: `min_age`, `max_age`, `ethnicity`, `location` (city/zip), `radius` (km), `limit`, `offset`.
- **Response**: `List[UserSummarySchema]`.

## Ratings API

### POST `/api/profiles/{user_id}/rate`
Submit a rating.
- **Request**: `{"score": 1-10}`.
- **Response**: `{"average_rating": float}`.
