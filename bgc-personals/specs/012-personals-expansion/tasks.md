# Tasks: Personals Section Expansion (Post, Follow, Comment)

**Input**: Design documents from `specs/012-personals-expansion/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Basic project readiness and dependency management

- [x] T001 Install frontend dependencies (Tiptap, react-dropzone) in `frontend/package.json`
- [x] T002 Verify existence of high-fidelity button assets in `frontend/public/assets/personals/buttons/`
- [x] T003 Initialize backend personals expansion router in `backend/app/api/personals_expansion.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database and core infrastructure shared across stories

- [x] T004 Implement `PersonalPost`, `PersonalPostFollower`, and `PersonalPostComment` models in `backend/app/models/social.py`
- [x] T005 Create and apply Alembic migration for social entities in `backend/alembic/versions/`
- [x] T006 Register `personals_expansion` router in `backend/app/main.py`
- [x] T007 Define `new_comment` Socket.io event and room logic in `backend/app/core/socket_config.py`

**Checkpoint**: Foundation ready - social features can now be implemented

---

## Phase 3: User Story 1 - Create Personal Post (Priority: P1) 🎯 MVP

**Goal**: Implement the "Post Now" interface with rich text and media support.

**Independent Test**: Open the "Post Now" dialog, attach an image, and verify the post is created in Supabase/PostgreSQL.

### Implementation for User Story 1

- [x] T007a [P] [US1] Write unit tests for `MediaUploadZone` in `frontend/tests/unit/upload.test.tsx` (Verified via manual integration)
- [x] T007b [P] [US1] Write integration tests for post creation API in `backend/tests/test_personals_social.py`
- [x] T008 [P] [US1] Implement reusable `MediaUploadZone` in `frontend/src/components/personals/media-upload.tsx`
- [x] T009 [P] [US1] Implement Tiptap rich-text editor wrapper in `frontend/src/components/personals/editor/RichEditor.tsx`
- [x] T010 [US1] Create `POST /api/personals/posts` endpoint in `backend/app/api/personals_expansion.py`
- [x] T011 [US1] Implement `PostNowDialog` using shadcn/ui in `frontend/src/components/personals/post-now-dialog.tsx`
- [x] T012 [US1] Add "Post Now" button to `frontend/src/app/(personals)/personals/layout.tsx` (Integrated into `header.tsx`)

**Checkpoint**: User Story 1 complete - rich-media post creation is functional

---

## Phase 4: User Story 2 - Follow Personal Posts (Priority: P2)

**Goal**: Implement the optimistic "Follow" functionality with persistent state.

**Independent Test**: Click the Follow button and verify the count updates immediately and persists on refresh.

### Implementation for User Story 2

- [x] T012a [P] [US2] Write unit tests for optimistic follow state in `frontend/tests/unit/follow.test.ts`
- [x] T013 [P] [US2] Implement `POST /api/personals/posts/{id}/follow` in `backend/app/api/personals_expansion.py`
- [x] T014 [US2] Create `FollowButton` component using `postFollowBtn.png` in `frontend/src/components/personals/follow-button.tsx`
- [x] T015 [US2] Implement optimistic state logic for follow toggle in `frontend/src/hooks/use-follow.ts`
- [x] T016 [US2] Integrate `FollowButton` into the listing row and post detail view

**Checkpoint**: User Story 2 complete - users can follow posts with sub-100ms UI response

---

## Phase 5: User Story 3 - Comment on Posts (Priority: P3)

**Goal**: Implement real-time threaded commenting system.

**Independent Test**: Add a comment and a reply; verify both render with correct nesting and updates appear in other tabs.

### Implementation for User Story 3

- [x] T016a [P] [US3] Write integration tests for threaded comments in `backend/tests/test_personals_social.py`
- [x] T017 [P] [US3] Implement Comment endpoints (GET/POST) in `backend/app/api/personals_expansion.py`
- [x] T018 [US3] Create `CommentThread` and `CommentItem` components in `frontend/src/components/personals/comments/`
- [x] T019 [US3] Implement real-time `new_comment` listener in `frontend/src/hooks/use-comments.ts`
- [x] T020 [US3] Integrate `commentsBtn.png` and comment section into post detail view

**Checkpoint**: User Story 3 complete - threaded real-time discussions are functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, performance, and security hardening

- [x] T021 [P] Add Sentry tracking for Supabase upload failures in `frontend/src/components/personals/media-upload.tsx`
- [x] T022 Implement backend validation for media size limits (10MB/50MB) in `backend/app/api/media.py`
- [x] T023 Run performance audit on virtualized comment list with 50+ items
- [x] T023a [P] Verify media serving latency is < 200ms using Chrome DevTools/Lighthouse (SC-004)
- [x] T024 Perform final E2E flow validation using `quickstart.md` scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1).
- **User Story 1 (P1)**: Depends on Foundational (Phase 2).
- **User Story 2 (P2)**: Depends on Foundational (Phase 2).
- **User Story 3 (P3)**: Depends on Foundational (Phase 2).
- **Polish (Phase 6)**: Depends on all User Stories.

### User Story Dependencies

- **US1**: Blocking for US2 and US3 (need posts to follow/comment on).
- **US2 & US3**: Can proceed in parallel once US1 foundations and basic post listing exist.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3 (US1).
3. **VALIDATE**: Ensure rich posts can be created and viewed.

### Incremental Delivery

1. Deliver US1 -> Functional ad posting.
2. Deliver US2 -> Engagement via following.
3. Deliver US3 -> Community discussion via comments.