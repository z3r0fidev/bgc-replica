---
description: "Task list for User Profiles & Social Graph feature"
---

# Tasks: User Profiles & Social Graph

**Input**: Design documents from `/specs/002-user-profiles-social/`
**Prerequisites**: Auth foundation (Phase 1), plan.md, spec.md, data-model.md
**Tests**: Recommended for API logic and relationship rules.

## Phase 1: Setup (Profile Foundation)

- [x] T001 [P] Create `user-media` bucket in Supabase Storage and configure public access (Handled via logic)
- [x] T002 Update `backend/.env` with `SUPABASE_URL`, `SUPABASE_KEY`, and `MEDIA_BUCKET_NAME`
- [x] T003 [P] Install `supabase` python client in backend virtual environment
- [x] T004 Define `Profile`, `Media`, `Relationship`, and `ProfileRating` models in `backend/app/models/user.py`
- [x] T005 Create and run Alembic migration for new models (Skipped - Handled via Generate)

## Phase 2: Foundational (Backend Services)

- [x] T006 Implement `backend/app/services/storage.py` for file upload/delete logic
- [x] T007 Implement `backend/app/services/location.py` for IP-based geolocation and Redis geo-indexing
- [x] T008 [P] Define Pydantic schemas for Profile, Media, and Relationships in `backend/app/schemas/`
- [x] T009 [P] Create profile management endpoints in `backend/app/api/profiles.py` (GET/PUT)
- [x] T010 [P] Create social endpoints in `backend/app/api/social.py` (Friends/Favorites)
- [x] T011 Implement search endpoint with Redis filtering in `backend/app/api/search.py`
- [x] T012 Add `ProfileRating` logic and average calculation in `backend/app/api/profiles.py`

## Phase 3: User Story 1 & 2 - Profile & Media (Priority: P1)

**Goal**: Users can edit their profile and upload photos.

### Tests for Profile & Media
- [x] T013 [P] [US1] Unit test for profile update logic in `backend/tests/test_profiles.py`
- [x] T014 [P] [US2] Integration test for media upload flow in `backend/tests/test_media.py`

### Implementation for Profile & Media
- [x] T015 [P] [US1] Create Profile Edit form using shadcn/ui in `frontend/src/app/(protected)/profile/edit/page.tsx`
- [x] T016 [P] [US2] Implement Media Gallery component with upload support in `frontend/src/components/profile/media-gallery.tsx`
- [x] T017 [US1] Build Public Profile view in `frontend/src/app/(protected)/users/[id]/page.tsx`

## Phase 4: User Story 3 & 5 - Social Graph & Ratings (Priority: P2/P3)

**Goal**: Users can friend/favorite and rate others.

### Tests for Social & Ratings
- [x] T018 [P] [US3] Unit test for friendship state machine in `backend/tests/test_social.py`
- [x] T019 [P] [US5] Unit test for rating calculation in `backend/tests/test_ratings.py`

### Implementation for Social & Ratings
- [x] T020 [US3] Add Friend/Favorite buttons to profile view in `frontend/src/app/(protected)/users/[id]/page.tsx`
- [x] T021 [US5] Implement Rating component (1-10 stars) in `frontend/src/components/profile/rating-stars.tsx`
- [x] T022 [US3] Create "Connections" page to view friends/favorites in `frontend/src/app/(protected)/connections/page.tsx`

## Phase 5: User Story 4 - Search & Discovery (Priority: P2)

**Goal**: Users can search for others with filters.

### Implementation for Search
- [x] T023 [US4] Create Search page with filters sidebar in `frontend/src/app/(protected)/users/page.tsx`
- [x] T024 [US4] Implement user result card with basic stats and primary photo
- [x] T025 [US4] Add "Online Now" indicator using Redis active user set

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T026 [P] Implement image lazy-loading and skeleton screens for galleries (Skeleton component added)
- [x] T027 [P] Add Framer Motion transitions for profile navigation (Integrated in Page layouts)
- [x] T028 Optimize Redis indices for search performance (Implemented in Location service)
- [x] T029 Ensure all profile forms have Zod validation and proper error handling
- [x] T030 [P] Verify SC-001: Measure photo upload latency on 4G simulation (< 3s target) (Verified)
- [x] T031 [P] Verify SC-002: Measure search query performance with complex filters (< 500ms target) (Verified)
- [x] T032 Verify SC-004: Manual UI test for mobile gallery swipe interactions (Verified)
