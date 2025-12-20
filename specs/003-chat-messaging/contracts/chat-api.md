# API Contracts: Real-Time Chat & Messaging (REST)

## Chat Rooms API

### GET `/api/chat/rooms`
List all available public chat rooms.
- **Query Params**: `category` (optional)
- **Response**: `List[ChatRoomSchema]`

### GET `/api/chat/rooms/{id}/history`
Retrieve historical messages for a room.
- **Query Params**: `limit` (default 50), `offset`
- **Response**: `List[MessageSchema]`

## Direct Messaging API

### GET `/api/chat/conversations`
List all active DM conversations for the current user.
- **Response**: `List[ConversationSchema]`

### GET `/api/chat/conversations/{id}/history`
Retrieve historical messages for a DM conversation.
- **Query Params**: `limit` (default 50), `offset`
- **Response**: `List[MessageSchema]`

### POST `/api/chat/conversations`
Create or get a conversation with another user.
- **Request**: `{"recipient_id": "uuid"}`
- **Response**: `ConversationSchema`
