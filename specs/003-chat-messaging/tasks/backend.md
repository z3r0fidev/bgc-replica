# Backend Tasks: Real-Time Chat & Messaging

## Phase 1: Setup

- [x] T007 [P] Install `python-socketio[asyncio]` and `redis` in backend virtual environment
- [x] T008 [P] Configure Socket.io server with Redis Manager in `backend/app/core/socket.py`
- [x] T009 [P] Initialize Socket.io mount in `backend/app/main.py`

## Phase 2: Foundational (Services)

- [x] T010 Implement `PresenceService` for heartbeat and status tracking in `backend/app/services/presence.py`
- [x] T011 Implement `ChatService` for broadcasting and message saving logic in `backend/app/services/chat.py`
- [x] T012 [P] Define Pydantic schemas for Room, Conversation, and Message in `backend/app/schemas/chat.py`
- [x] T040 [P] Implement chat media upload endpoint `POST /api/chat/media` in `backend/app/api/chat.py`

## Phase 3: User Story 1 - Direct Messaging

- [x] T013 [P] [US1] Create DM REST endpoints (list, history, create) in `backend/app/api/chat.py`
- [x] T014 [US1] Implement `send_dm` WebSocket event handler with block list check in `backend/app/core/socket.py`
- [x] T015 [US1] Implement real-time notification logic for new DMs

## Phase 4: User Story 2 - Public Chat Rooms

- [x] T016 [P] [US2] Create Chat Room REST endpoints (list, history) in `backend/app/api/chat.py`
- [x] T017 [US2] Implement `join_room` and `send_room_message` WebSocket handlers in `backend/app/core/socket.py`
- [x] T018 [US2] Implement system message broadcast for users joining/leaving

## Phase 5: User Story 3 & 4 - Presence & Organization

- [x] T019 [US3] Implement `presence` heartbeat handler and broadcast status changes
- [x] T020 [US4] Add category filtering logic to Chat Room endpoints
- [x] T041 [US4] Implement dynamic room suggestion logic (threshold: > 20 users in 50km radius) in `backend/app/services/chat.py`

## Phase 6: Polish

- [x] T021 [P] Implement message rate-limiting middleware for WebSockets
...<5 lines>...
- [x] T042 [P] Benchmark WebSocket message latency to verify SC-001 (< 200ms) (Verified)
- [x] T043 [P] Verify presence propagation speed to verify SC-003 (< 2s) (Verified)
- [x] T044 [P] Configure health checks and uptime monitoring (SC-004) in `backend/app/main.py`
