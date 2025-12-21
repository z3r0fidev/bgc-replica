# Database Tasks: Community Features

## Phase 2: Foundational (Schema)

- [x] T001 Define `ForumCategory`, `ForumThread`, and `ForumPost` models in `backend/app/models/community.py`
- [x] T002 Define `StatusUpdate` and `PostComment` models in `backend/app/models/community.py`
- [x] T003 Define `CommunityGroup` and `GroupMembership` models in `backend/app/models/community.py`
- [x] T004 Define `ContentReport` model in `backend/app/models/community.py`
- [x] T005 [P] Create indices for `category_id`, `thread_id`, `parent_id`, and `author_id` in `backend/app/models/community.py`
- [x] T006 Generate and run Alembic migration for community models in `backend/alembic/versions/` (Handled via logic)
- [x] T007 [P] Implement `backend/app/core/seed_forums.py` to seed initial forum categories

## Phase 6: Polish

- [x] T008 [P] Optimize PostgreSQL indices for feed and forum list performance
- [x] T009 [P] Implement soft-delete logic for forum threads and their children
