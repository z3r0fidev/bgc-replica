# Tasks: Media Gallery & Albums

**Input**: Design documents from `specs/010-media-gallery-albums/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Database and infrastructure setup

- [x] T001 Create `GalleryMedia`, `Album`, `AlbumMedia` models in `backend/app/models/gallery.py`
- [x] T002 Create Alembic migration for gallery tables in `backend/alembic/versions/`
- [x] T003 Define Pydantic schemas in `backend/app/schemas/gallery.py`
- [ ] T004 Configure Supabase Storage bucket policies for gallery folder

**Checkpoint**: Database ready for gallery operations

---

## Phase 2: User Story 1 - Personal Gallery (Priority: P1) MVP

**Goal**: Users can upload images and view them in a personal gallery.

**Independent Test**: Upload an image, verify it appears in gallery grid, open in lightbox.

### Backend Implementation

- [x] T005 [US1] Implement `POST /api/media/upload` endpoint in `backend/app/api/gallery.py`
- [x] T006 [US1] Create thumbnail generation service in `backend/app/services/media_processor.py`
- [x] T007 [US1] Implement `GET /api/media/` (paginated list) in `backend/app/api/gallery.py`
- [x] T008 [US1] Implement `GET /api/media/{id}` in `backend/app/api/gallery.py`
- [x] T009 [US1] Implement `DELETE /api/media/{id}` in `backend/app/api/gallery.py`
- [x] T010 [P] [US1] Write integration tests in `backend/tests/test_gallery.py`

### Frontend Implementation

- [x] T011 [P] [US1] Create `MediaUploader` component in `frontend/src/components/gallery/MediaUploader.tsx`
- [x] T012 [P] [US1] Create `GalleryGrid` component in `frontend/src/components/gallery/GalleryGrid.tsx`
- [x] T013 [US1] Create `MediaLightbox` component in `frontend/src/components/gallery/MediaLightbox.tsx`
- [x] T014 [US1] Create gallery page at `frontend/src/app/(protected)/gallery/page.tsx`
- [ ] T015 [P] [US1] Write unit tests in `frontend/tests/unit/gallery.test.tsx`

**Checkpoint**: User Story 1 complete - basic gallery is functional

---

## Phase 3: User Story 2 - Albums & Organization (Priority: P2)

**Goal**: Users can create albums and organize media into collections.

**Independent Test**: Create album, add photos, verify album displays with cover.

### Backend Implementation

- [x] T016 [US2] Implement album CRUD endpoints in `backend/app/api/gallery.py`
- [x] T017 [US2] Implement `POST /api/albums/{id}/media` (add media to album)
- [x] T018 [US2] Implement `DELETE /api/albums/{id}/media/{media_id}` (remove from album)
- [x] T019 [US2] Implement album reordering endpoint
- [x] T020 [P] [US2] Write integration tests in `backend/tests/test_gallery.py` (combined with media tests)

### Frontend Implementation

- [x] T021 [P] [US2] Create `AlbumCard` component in `frontend/src/components/gallery/AlbumCard.tsx`
- [x] T022 [P] [US2] Create `AlbumEditor` component in `frontend/src/components/gallery/AlbumEditor.tsx`
- [x] T023 [US2] Create albums list page at `frontend/src/app/(protected)/gallery/albums/page.tsx`
- [x] T024 [US2] Create single album page at `frontend/src/app/(protected)/gallery/albums/[id]/page.tsx`
- [x] T025 [US2] Implement drag-drop reordering in album view

**Checkpoint**: User Story 2 complete - album organization functional

---

## Phase 4: User Story 3 - Privacy & Sharing (Priority: P3)

**Goal**: Users can control media privacy and share albums.

**Independent Test**: Set album to Friends Only, verify non-friends cannot access.

### Backend Implementation

- [x] T026 [US3] Implement `PATCH /api/media/{id}` for privacy updates
- [ ] T027 [US3] Add privacy filtering to `GET /api/users/{id}/gallery`
- [x] T028 [US3] Implement `POST /api/albums/{id}/share` (generate share link)
- [x] T029 [US3] Implement `GET /api/albums/shared/{token}` (access shared album)
- [x] T030 [P] [US3] Write privacy integration tests in `backend/tests/test_gallery.py`

### Frontend Implementation

- [ ] T031 [P] [US3] Add privacy selector to media/album forms (reuse PrivacyToggle)
- [ ] T032 [US3] Create public gallery view at `frontend/src/app/(protected)/profile/[id]/gallery/page.tsx`
- [ ] T033 [US3] Create shared album view at `frontend/src/app/shared/album/[token]/page.tsx`
- [ ] T034 [US3] Add share dialog to album view

**Checkpoint**: User Story 3 complete - privacy controls functional

---

## Phase 5: User Story 4 - Video Support (Priority: P4)

**Goal**: Users can upload and view videos.

**Independent Test**: Upload video, verify thumbnail generated, play in lightbox.

### Backend Implementation

- [ ] T035 [US4] Extend upload endpoint for video handling
- [ ] T036 [US4] Implement video thumbnail extraction in `media_processor.py`
- [ ] T037 [P] [US4] Write video upload tests

### Frontend Implementation

- [ ] T038 [P] [US4] Update MediaUploader for video file types
- [ ] T039 [US4] Add video player to MediaLightbox
- [ ] T040 [US4] Add video duration display in gallery grid

**Checkpoint**: User Story 4 complete - video support functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance, accessibility, and final verification

- [ ] T041 [P] Implement lazy loading for gallery images
- [ ] T042 [P] Add keyboard navigation to lightbox (arrows, escape)
- [ ] T043 [P] E2E test for upload flow in `frontend/tests/e2e/gallery-upload.spec.ts`
- [ ] T044 [P] E2E test for album management in `frontend/tests/e2e/gallery-albums.spec.ts`
- [ ] T045 Run performance audit (SC-002: gallery load < 500ms)
- [ ] T046 Accessibility review for lightbox and upload components

**Checkpoint**: Phase 6 complete - gallery is production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **US1 (Phase 2)**: Depends on Setup completion
- **US2 (Phase 3)**: Depends on US1 (needs media to add to albums)
- **US3 (Phase 4)**: Depends on US1 and US2 (needs content to protect)
- **US4 (Phase 5)**: Depends on US1 (extends existing upload)
- **Polish (Phase 6)**: Depends on all user stories

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:
- T010, T011, T012, T015 (US1 backend tests + frontend components)
- T020, T021, T022 (US2 tests + components)
- T030, T031 (US3 tests + privacy UI)
- T037, T038 (US4 tests + uploader update)
- T041, T042, T043, T044 (Polish tasks)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1
3. **STOP and VALIDATE**: Ensure image upload and gallery view work correctly
4. Deploy/demo if ready

### Incremental Delivery

1. Foundation Ready → Database and storage configured
2. Story 1 Delivered → Basic image gallery working
3. Story 2 Delivered → Albums for organization
4. Story 3 Delivered → Privacy controls active
5. Story 4 Delivered → Full media support with video
