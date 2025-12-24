# Tasks: Personals Section (TransX Style)

**Input**: Design documents from `specs/010-personals-section/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and asset preparation

- [x] T001 [P] Move downloaded PNG assets to `frontend/public/assets/personals/icons/` and `banners/`
- [x] T002 [P] Create frontend component structure in `frontend/src/components/personals/`
- [x] T003 Initialize backend personals router in `backend/app/api/personals.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data and API structures that MUST be complete before user story implementation

- [x] T004 Add `is_personal` field to `Profile` model in `backend/app/models/user.py`
- [x] T005 Implement `GET /api/personals/categories` in `backend/app/api/personals.py`
- [x] T005a [P] Write integration tests for categories API in `backend/tests/test_personals.py`
- [x] T006 [P] Define Personals frontend service in `frontend/src/services/personals.ts`
- [x] T006a [P] Write unit tests for personals service in `frontend/tests/unit/personals.test.ts`
- [x] T007 Create basic `PersonalsLayout` shell in `frontend/src/app/(personals)/personals/layout.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Categorical Browsing via Sidebar (Priority: P1) 🎯 MVP

**Goal**: Implement the iconic right-sidebar navigation and themed headers.

**Independent Test**: Click sidebar icons and verify the header banner updates and URL changes to `[category]`.

### Implementation for User Story 1

- [x] T007a [P] [US1] Write component tests for `FeaturedListsSidebar` in `frontend/tests/unit/sidebar.test.tsx`
- [x] T008 [US1] Implement `FeaturedListsSidebar` component in `frontend/src/components/personals/sidebar.tsx`
- [x] T009 [US1] Create category page route in `frontend/src/app/(personals)/personals/[category]/page.tsx`
- [x] T010 [US1] Implement themed `PersonalsHeader` in `frontend/src/components/personals/header.tsx`
- [x] T011 [US1] Add Mobile Drawer wrapper for Sidebar in `frontend/src/components/personals/mobile-nav.tsx` (ensure breakpoint logic is included)
- [x] T012 [US1] Integrate Sidebar and Header into `PersonalsLayout`

**Checkpoint**: User Story 1 functional - sidebar drives navigation and visual theme

---

## Phase 4: User Story 2 - High-Density Personal Listings (Priority: P2)

**Goal**: Implement the virtualized list view for high-performance browsing.

**Independent Test**: Load 100+ profiles and verify smooth 60fps scrolling and correct row layout.

### Implementation for User Story 2

- [x] T012a [P] [US2] Write unit tests for virtualized list scrolling in `frontend/tests/unit/list.test.tsx`
- [x] T013 [US2] Implement `GET /api/personals/listings` with cursor pagination in `backend/app/api/personals.py`
- [x] T014 [US2] Create `PersonalListingRow` component in `frontend/src/components/personals/row.tsx`
- [x] T015 [US2] Implement `VirtualizedListingView` using `@tanstack/react-virtual` in `frontend/src/components/personals/list.tsx`
- [x] T016 [US2] Connect `listings` API to the virtualized list in the category page

**Checkpoint**: User Story 2 functional - performant list of personals is visible

---

## Phase 5: User Story 3 - Geographic & Attribute Filtering (Priority: P3)

**Goal**: Integrate location and profile attribute filtering into the personals view.

**Independent Test**: Filter by "Philadelphia" and "Top" and verify list results are filtered correctly.

### Implementation for User Story 3

- [x] T016a [P] [US3] Write E2E tests for location filtering in `frontend/tests/e2e/personals_filter.spec.ts`
- [x] T017 [US3] Add `city` and `state` filtering to `GET /api/personals/listings` in `backend/app/api/personals.py`
- [x] T018 [US3] Implement `LocationSelector` component in `frontend/src/components/personals/location-filter.tsx`
- [x] T019 [US3] Integrate attribute filters (Position, Build) into the listings view state

**Checkpoint**: All user stories functional - complete personals directory with filtering

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, performance checks, and cleanup

- [x] T020 [P] Add Sentry error tracking to personals API fetch calls
- [x] T021 [P] Implement zero-state empty results view in `frontend/src/components/personals/list.tsx`
- [x] T022 [P] Perform final visual regression check against TransX layout
- [x] T023 Run `quickstart.md` validation scenarios
- [x] T024 [P] Run Lighthouse / Performance benchmarks to verify SC-001 (<200ms) and SC-002 (60 FPS) goals

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)** -> **Foundational (Phase 2)** -> **User Stories (Phase 3+)**
- **Phase 3 (US1)** and **Phase 4 (US2)** can proceed in parallel once Phase 2 is done.
- **Phase 5 (US3)** depends on Phase 4 (Listings) being functional.

### Parallel Opportunities
- T001, T002 (Frontend setup) and T003 (Backend setup).
- T008 (Sidebar) and T010 (Header) once layout shell is ready.
- T014 (Row UI) and T013 (Listings API).

---

## Implementation Strategy

### MVP Scope
- Complete Phases 1, 2, and 3 (US1).
- Delivers the categorical navigation and visual branding which is the primary request.

### Incremental Delivery
- Add Phase 4 (US2) to provide the actual browsing experience.
- Add Phase 5 (US3) to add practical utility for local users.
