# Backend Tasks: Community Features

## Phase 2: Foundational (Services)

- [x] T010 Implement `FeedService` with Fan-out-on-Write logic using Redis in `backend/app/services/feed_service.py`
- [x] T011 Implement `ModerationService` with report threshold logic in `backend/app/services/moderation_service.py`
- [x] T012 [P] Define Pydantic schemas for Forums, Feed, Groups, and Reports in `backend/app/schemas/community.py`

## Phase 3: User Story 1 - Threaded Forum Boards

- [x] T013 [P] [US1] Create Forum Category and Thread list endpoints in `backend/app/api/forums.py`
- [x] T014 [US1] Create Thread retrieval endpoint with nested replies in `backend/app/api/forums.py`
- [x] T015 [US1] Create Thread and Post creation endpoints with image attachment support in `backend/app/api/forums.py`

## Phase 4: User Story 2 - Social Feed & Status Updates

- [x] T016 [P] [US2] Create Social Feed retrieval endpoint (Global/Following) in `backend/app/api/feed.py`
- [x] T017 [US2] Create Status Update and Comment endpoints in `backend/app/api/feed.py`
- [x] T018 [US2] Implement fan-out logic in background tasks for follower feeds

## Phase 5: User Story 3 - User-Led Groups

- [x] T019 [P] [US3] Create Group management endpoints (create, join, list) in `backend/app/api/groups.py`
- [x] T020 [US3] Create Group-specific feed retrieval in `backend/app/api/groups.py`

## Phase 6: User Story 4 - Community-Driven Moderation

- [x] T021 [P] [US4] Create Content Reporting endpoint in `backend/app/api/moderation.py`
- [x] T022 [US4] Create Moderation Queue endpoint for admins in `backend/app/api/moderation.py`
- [x] T023 [US4] Create Resolve Report endpoint in `backend/app/api/moderation.py`

## Phase N: Polish

- [x] T024 [P] Unit tests for Feed aggregation in `backend/tests/test_feed.py`
- [x] T025 [P] Unit tests for Threaded Forum retrieval in `backend/tests/test_forums.py`
- [x] T026 [P] Configure health checks for Redis connectivity and verify feed index (feed:global) existence in `backend/app/main.py`
- [x] T043 [P] Conduct load testing (Locust/k6) to verify SC-004 (500 concurrent posters)
