# Tasks: Community Forums Re-Design

**Input**: Design documents from `specs/011-community-forum-redesign/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Basic structure and asset preparation

- [x] T001 [P] Move 15+ forum-specific banner and icon assets to `frontend/public/assets/forums/`
- [x] T001a [P] Generate/Verify "Liquid Glass" status icons (sticky, hot, unread, locked) in `frontend/public/assets/forums/icons/`
- [x] T002 [P] Create frontend component structure in `frontend/src/components/forums/`
- [x] T003 Configure "Liquid Glass" design tokens in `frontend/tailwind.config.ts` per research.md (Updated in globals.css for Tailwind 4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required for all user stories

- [x] T004 Update `ForumCategory` model in `backend/app/models/community.py` to support `parent_id` and self-referential relationship
- [x] T005 Create and apply Alembic migration for `ForumCategory` hierarchy in `backend/alembic/versions/`
- [x] T006 Implement `GET /api/forums/tree` in `backend/app/api/forums.py` with recursive tree building
- [x] T007 Implement Redis Set methods for active user tracking in `backend/app/services/presence.py`
- [x] T008 Add `join_forum` and `leave_forum` events to Socket.io server in `backend/app/core/socket.py`
- [x] T008a [P] Write unit tests for tree traversal and stats logic in `frontend/tests/unit/forums.test.ts`

**Checkpoint**: Foundation ready - tree navigation and real-time tracking can now be implemented

---

## Phase 3: User Story 1 - Categorical Tree Navigation (Priority: P1) 🎯 MVP

**Goal**: Implement hierarchical tree-view of forum categories in a persistent sidebar.

**Independent Test**: Expand/collapse parent categories in sidebar and click sub-forum nodes to trigger navigation.

### Implementation for User Story 1

- [x] T009 [US1] Implement `ForumTreeNav` component in `frontend/src/components/forums/tree-nav.tsx` using shadcn/ui
- [x] T010 [US1] Create forum tree fetcher service in `frontend/src/services/forums.ts`
- [x] T011 [US1] Create dynamic routing structure for forums in `frontend/src/app/(forums)/forums/[...slug]/page.tsx`
- [x] T012 [US1] Implement `ForumLayout` with persistent sidebar in `frontend/src/app/(forums)/forums/layout.tsx`

**Checkpoint**: User Story 1 complete - hierarchical navigation is functional

---

## Phase 4: User Story 2 - High-Density Thread Browsing (Priority: P2)

**Goal**: Implement condensed thread list with stats and virtualization.

**Independent Test**: Scroll through 100+ threads on mobile; verify 60fps performance and visibility of 12+ rows.

### Implementation for User Story 2

- [x] T013 [US2] Update `GET /api/forums/categories/{slug}/threads` in `backend/app/api/forums.py` to support high-density metadata
- [x] T014 [US2] Create `ThreadRow` component in `frontend/src/components/forums/thread-row.tsx` with condensed layout
- [x] T015 [US2] Implement virtualized thread list using `@tanstack/react-virtual` in `frontend/src/components/forums/thread-list.tsx`
- [x] T016 [US2] Add status icons (Sticky, Hot, Unread) to `ThreadRow` based on thread metadata

**Checkpoint**: User Story 2 complete - high-density thread list is performant and informative

---

## Phase 5: User Story 3 - Themed Branding & Aesthetics (Priority: P3)

**Goal**: Apply Liquid Glass aesthetics and topical categorical banners.

**Independent Test**: Verify that "Health" forum shows a wellness banner and rows use glassmorphism backdrop-blur.

### Implementation for User Story 3

- [x] T017 [US3] Implement `ForumHeader` in `frontend/src/components/forums/forum-header.tsx` with dynamic banner selection
- [x] T018 [US3] Apply Glassmorphism styling to `ThreadRow` and list containers in `frontend/src/components/forums/`
- [x] T019 [US3] Implement "Create Thread" Floating Action Button (FAB) in `frontend/src/components/forums/create-thread-fab.tsx`
- [x] T020 [US3] Create `ForumBreadcrumbs` component in `frontend/src/components/forums/breadcrumbs.tsx` with recursive traversal

**Checkpoint**: User Story 3 complete - forum re-design meets branding and aesthetic requirements

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final enhancements and validation

- [x] T021 [P] Implement real-time active user count display using Socket.io in `frontend/src/components/forums/stats.tsx`
- [x] T023 Run performance audit to verify SC-001 (<150ms nav) and SC-002 (12+ rows visible)
- [x] T024 Perform documentation review and finalize `quickstart.md` validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all User Stories.
- **User Story 1 (P1)**: Starts after Foundation. Defines the navigation structure.
- **User Story 2 (P2)**: Starts after US1 routing is ready.
- **User Story 3 (P3)**: Starts after US2 listings are functional.
- **Polish (Phase 6)**: Final verification after all stories are complete.

### User Story Dependencies

- **US1 -> US2**: US1 provides the page structure and routing needed to display the US2 thread list.
- **US2 -> US3**: US3 applies styling and banners to the lists created in US2.

### Parallel Opportunities

- T001, T002, T003 can run in parallel.
- T007, T008 (Socket/Redis) can run in parallel with T004, T005, T006 (DB/API).
- T021, T022 can run in parallel with polish tasks.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2 (Prerequisites).
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: Verify hierarchical navigation works with placeholder content.

### Incremental Delivery

1. Foundation Ready -> Hierarchy and Real-time foundations in place.
2. Story 1 Delivered -> Users can navigate the new category tree.
3. Story 2 Delivered -> Users can browse threads with high performance.
4. Story 3 Delivered -> Full visual polish and branding applied.