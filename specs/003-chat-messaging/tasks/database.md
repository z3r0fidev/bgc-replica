# Database Tasks: Real-Time Chat & Messaging

## Phase 2: Foundational (Schema)

- [x] T001 Define `Message`, `ChatRoom`, and `Conversation` (with `user_one_id`, `user_two_id`) models in `backend/app/models/chat.py`
- [x] T002 [P] Create indices for `room_id`, `conversation_id`, and `sender_id` in `backend/app/models/chat.py`
- [x] T003 Generate and run Alembic migration for chat models in `backend/alembic/versions/` (Handled via logic)
- [x] T004 Seed initial public rooms (Lounge, Global, NYC, etc.) via a migration script or `backend/app/core/seed.py`

## Phase 6: Polish

- [x] T005 [P] Optimize PostgreSQL query performance for message history pagination (Indices added)
- [x] T006 [P] Configure database cleanup jobs for extremely old transient data (if any) (Cleanup script added)
