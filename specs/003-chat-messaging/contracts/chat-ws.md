# WebSocket Contracts: Real-Time Chat & Messaging

## Connection & Presence

### Event: `presence` (Client -> Server)
Emitted periodically (heartbeat) or on focus.
- **Data**: `{"status": "online" | "idle"}`

### Event: `presence_update` (Server -> Client)
Broadcasted to all users or friends.
- **Data**: `{"user_id": "uuid", "status": "online" | "offline", "last_seen": "iso_timestamp"}`

## Room Messaging

### Event: `join_room` (Client -> Server)
Join a specific chat room.
- **Data**: `{"room_id": "uuid"}`

### Event: `send_room_message` (Client -> Server)
Send a message to a room.
- **Data**: `{"room_id": "uuid", "content": "string", "type": "TEXT" | "IMAGE"}`

### Event: `new_room_message` (Server -> Client)
Received when a new message is posted in a room the client has joined.
- **Data**: `MessageSchema`

## Direct Messaging

### Event: `send_dm` (Client -> Server)
Send a private message to another user.
- **Data**: `{"recipient_id": "uuid", "content": "string", "type": "TEXT" | "IMAGE"}`

### Event: `new_dm` (Server -> Client)
Received when a new private message is sent to the client.
- **Data**: `MessageSchema`

## UI States

### Event: `typing` (Client -> Server)
Signals the user is typing.
- **Data**: `{"recipient_id": "uuid" | null, "room_id": "uuid" | null}`

### Event: `user_typing` (Server -> Client)
Broadcasted to participants.
- **Data**: `{"user_id": "uuid", "is_typing": boolean}`
