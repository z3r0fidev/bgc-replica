# Tasks: Final Polish & Production Readiness

## Phase 1: Core API & Data Hardening

- [x] T000 [TDD] Create unit tests for cursor-based pagination in `backend/tests/test_pagination.py`
- [x] T001 Implement `backend/app/core/pagination.py` for cursor-based navigation
- [x] T002 Update `backend/app/api/feed.py` to use cursor-based pagination
- [x] T003 [P] Update `backend/app/api/social.py` and `backend/app/api/profiles.py` to use cursor-based pagination
- [x] T004 Optimize Social/Profile queries with `selectinload` in `backend/app/services/social.py`
- [x] T005 Implement `backend/app/core/exceptions.py` and register in `backend/app/main.py`

## Phase 2: Advanced Caching & Indexing

- [x] T006 Create Alembic migration for GIN/BRIN indexes on JSONB and messages
- [x] T007 Implement Redis cache-aside logic for user profiles in `backend/app/services/cache.py`
- [x] T008 Configure database backup verification script `backend/scripts/verify_backups.py`

## Phase 3: UX & Animation Refinement

- [x] T009 [P] Install `framer-motion` (if not already) and create transition wrappers in `frontend/src/components/layout/`
- [x] T010 Implement Shared Layout transitions for page navigation in `frontend/src/app/layout.tsx`
- [x] T011 Implement `useGestures` hook and apply to Feed items for mobile interactions
- [x] T012 Apply Neo-brutalist and Glassmorphism styling to core components in `frontend/src/components/ui/`
- [x] T013 Implement Voice Command service using Web Speech API in `frontend/src/hooks/use-voice-commands.ts`

## Phase 4: Monitoring & Polish

- [x] T014 Set up `prometheus-fastapi-instrumentator` in `backend/app/main.py`
- [x] T015 Perform final accessibility audit and fix WCAG 2.1 AA violations
- [x] T016 Execute load tests using `backend/tests/load_test.py` and verify 10k concurrent users

## Execution Order
1. **Setup**: T001, T005, T009.
2. **Core Backend**: T002, T003, T004.
3. **Database**: T006, T007.
4. **Core Frontend**: T010, T011, T012, T013.
5. **Infrastructure**: T008, T014.
6. **Validation**: T015, T016.
