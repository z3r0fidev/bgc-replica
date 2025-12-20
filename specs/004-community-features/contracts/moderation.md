# API Contracts: Moderation

## Reporting

### POST `/api/moderation/report`
Flag content for review.
- **Request**: `{"content_type": "string", "content_id": "uuid", "reason": "string"}`
- **Response**: `{"status": "reported"}`

## Administrative Queue

### GET `/api/moderation/queue` (Admin Only)
List flagged content requiring review.
- **Response**: `List[ReportSchema]`

### POST `/api/moderation/resolve/{report_id}` (Admin Only)
Take action on a report.
- **Request**: `{"action": "dismiss" | "delete_content" | "warn_user"}`
- **Response**: `{"status": "resolved"}`
