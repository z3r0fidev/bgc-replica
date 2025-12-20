# Research: Real-Time Chat & Messaging

## 1. WebSocket Integration

**Decision**: Use **Socket.io** with a **Redis Adapter** for the FastAPI backend and `socket.io-client` for the Next.js frontend.

**Rationale**:
- **Flexibility**: Socket.io provides robust support for rooms, namespaces, and automatic reconnection out of the box.
- **Scalability**: The Redis adapter allows for horizontal scaling of the WebSocket server across multiple instances.
- **FastAPI Compatibility**: Integration with `python-socketio` is well-documented and performs well in asynchronous environments.
- **Custom Logic**: Enables easier implementation of complex social features like "typing..." indicators and granular presence tracking compared to more rigid managed services.

**Alternatives Considered**:
- *Supabase Realtime*: Rejected because it is more coupled to database changes and less flexible for custom transient events (like typing indicators).
- *Native WebSockets*: Rejected due to the lack of built-in features like rooms and automatic reconnection.

## 2. Online Presence Tracking

**Decision**: Use **Redis** with a heartbeat mechanism.

**Rationale**:
- **Sorted Sets (Zsets)**: Store `user_id` as members and `unix_timestamp` as scores. This allows for efficient queries of "Who is online?" by checking users with timestamps within the last 60 seconds.
- **Heartbeat**: Clients will emit a `presence` event every 30 seconds to keep their status active.
- **Efficiency**: Redis is optimized for these sub-second updates, preventing database bloat in PostgreSQL.

## 3. Media Handling in Chat

**Decision**: **HTTP Upload + WebSocket Signaling** pattern.

**Rationale**:
- **Performance**: Large binary data (photos/video) can block the WebSocket event loop. Offloading to standard HTTP uploads (Supabase Storage) ensures the chat stream remains responsive.
- **Reliability**: Standard uploads support progress tracking and retries more effectively.
- **Flow**:
  1. Client uploads file to Supabase Storage via API.
  2. Storage returns a public URL.
  3. Client sends a JSON message via WebSocket containing the URL and metadata (width, height, type).
  4. Server broadcasts the metadata to recipients.
