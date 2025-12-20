# API Contracts: Social Feed

## Status Updates

### GET `/api/feed`
Retrieve the social feed.
- **Query Params**: `type` ("global" | "following"), `limit`, `cursor`.
- **Response**: `List[StatusUpdateSchema]`

### POST `/api/feed`
Post a new status update.
- **Request**: `{"content": "string", "image_url": "optional"}`
- **Response**: `StatusUpdateSchema`

## Comments

### GET `/api/feed/{post_id}/comments`
List comments on a status update.
- **Response**: `List[PostCommentSchema]`

### POST `/api/feed/{post_id}/comments`
Comment on a status update.
- **Request**: `{"content": "string"}`
- **Response**: `PostCommentSchema`
