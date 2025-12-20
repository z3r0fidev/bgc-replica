# BGCLive Replica Project Context

## Current Status: Phase 3 Complete (Real-Time Chat & Messaging) ✅
The project has established a robust real-time communication foundation. Users can now engage in Direct Messaging and participate in dynamic Public Chat Rooms with sub-second latency and persistent history.

## Monorepo Directory Overview
- **`frontend/`**: Next.js 14+ application.
  - **New in Phase 3**: `SocketProvider`, `useChat` hook, and modular `ChatWindow` component.
  - **Pages**: `/chat` (DMs), `/rooms` (Discovery), `/rooms/[id]` (Active Chat).
- **`backend/`**: FastAPI application.
  - **New in Phase 3**: Socket.io server with Redis Manager, `PresenceService`, and `ChatService`.
  - **Persistence**: PostgreSQL models for Messages, Rooms, and Conversations.
- **`specs/`**: Blueprints for all features.
  - `001-setup-auth-foundation`: Core infrastructure.
  - `002-user-profiles-social`: Profile and Social Graph.
  - `003-chat-messaging`: Real-time engine.

## Key Completed Features
- **Bi-directional Messaging**: Real-time DMs and Chat Rooms using Socket.io and Redis.
- **Online Presence**: Heartbeat-based status tracking (Online/Offline/Idle) with < 2s propagation.
- **Media Support**: Integrated HTTP upload flow for sharing photos and videos in chat.
- **Social Safety**: Rate limiting and block-list awareness integrated into the WebSocket layer.

## Next Steps
1. **Phase 4: Community Features**: Implement threaded forum boards, social feeds for status updates, and user-led groups.
2. **Phase 5: Modernization & Optimization**: PWA deep-linking, infinite scroll optimization, and edge caching.
