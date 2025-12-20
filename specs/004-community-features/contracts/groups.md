# API Contracts: Groups

## Management

### GET `/api/groups`
Search and browse community groups.
- **Query Params**: `query`, `category`.
- **Response**: `List[GroupSchema]`

### POST `/api/groups`
Create a new user-led group.
- **Request**: `{"name": "string", "description": "string", "is_private": "boolean"}`
- **Response**: `GroupSchema`

### POST `/api/groups/{id}/join`
Join a public or private group.

### GET `/api/groups/{id}/feed`
Retrieve the internal status feed for a group.
- **Response**: `List[StatusUpdateSchema]`
