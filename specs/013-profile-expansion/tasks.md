# Tasks: User Profile Expansion

**Input**: Design documents from `specs/013-profile-expansion/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Basic directory and environment readiness

- [x] T001 Create component structure in `frontend/src/components/profile/edit/`
- [x] T002 Verify existence of `Profile` model in `backend/app/models/user.py` for extension

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database and core schema infrastructure shared across all modules

- [x] T003 Update `Profile` model in `backend/app/models/user.py` with indexed columns (`display_name`, `relationship_status`, `industry`, `gender_identity`) and JSONB columns (`social_links`, `privacy_settings`)
- [x] T004 Create and apply Alembic migration for profile extensions in `backend/alembic/versions/`
- [x] T005 Define extended Pydantic schemas in `backend/app/schemas/profile.py` per `data-model.md`
- [x] T006 Implement privacy-aware serialization logic in `backend/app/api/profiles.py` (masking fields based on `privacy_settings`)

**Checkpoint**: Foundation ready - profile modules can now be implemented independently

---

## Phase 3: User Story 1 - Identity & Demographic Branding (Priority: P1) 🎯 MVP

**Goal**: Implement identity-specific fields (Display Name, Pronouns, Gender) with tabbed UI.

**Independent Test**: Navigate to the "Identity" tab, update Display Name and Pronouns, and verify they persist on the public profile view.

### Implementation for User Story 1

- [x] T007 [P] [US1] Write integration tests for Identity PATCH endpoint in `backend/tests/test_profiles_expansion.py`
- [x] T007a [P] [US1] Write unit tests for IdentityForm in `frontend/tests/unit/profile-identity.test.tsx`
- [x] T008 [P] [US1] Create `IdentityForm` component in `frontend/src/components/profile/edit/IdentityTab.tsx` using `shadcn/ui`
- [x] T009 [US1] Implement Identity module update logic in PATCH `/api/profiles/me` within `backend/app/api/profiles.py`
- [x] T010 [US1] Create main `ProfileEditTabs` wrapper in `frontend/src/app/(protected)/profile/edit/page.tsx`
- [x] T011 [US1] Create `ProfileView` in `frontend/src/components/profile/view/ProfileView.tsx` + viewing page at `/profile/[id]`

**Checkpoint**: User Story 1 complete - basic social identity is functional ✅

---

## Phase 4: User Story 2 - Lifestyle & Social Intent (Priority: P2)

**Goal**: Implement connection-centric fields (Relationship Status, "Looking For") and integrate with discovery filters.

**Independent Test**: Filter the global search by "Relationship Status: Single" and verify the results accurately reflect updated profiles.

### Implementation for User Story 2

- [x] T012 [P] [US2] Write integration tests for Lifestyle/Filter logic in `backend/tests/test_profiles_expansion.py`
- [x] T013 [P] [US2] Create `LifestyleTab` component in `frontend/src/components/profile/edit/tabs/LifestyleTab.tsx` with multi-select support
- [x] T014 [US2] Implement Lifestyle module update logic in `backend/app/api/profiles.py`
- [x] T015 [US2] Update discovery filter service in `backend/app/api/search.py` to include Relationship Status and Intent
- [x] T016 [US2] Add Lifestyle intent tags to `frontend/src/components/profile/view/ProfileView.tsx`

**Checkpoint**: User Story 2 complete - users can find each other based on social intent ✅

---

## Phase 5: User Story 3 - Professional & Social Graph (Priority: P3)

**Goal**: Implement professional fields, external social links, and granular privacy toggles.

**Independent Test**: Set "Occupation" to Private and verify it is hidden from other users while remaining visible to the owner.

### Implementation for User Story 3

- [x] T017 [P] [US3] Write integration tests for privacy masking and bulk privacy update in `backend/tests/test_profiles_expansion.py`
- [x] T017a [P] [US3] Implement `use-profile-privacy` hook in `frontend/src/hooks/use-profile-privacy.ts`
- [x] T018 [P] [US3] Create `ProfessionalTab` in `frontend/src/components/profile/edit/tabs/ProfessionalTab.tsx`
- [x] T019 [P] [US3] Create `SocialLinksTab` in `frontend/src/components/profile/edit/tabs/SocialLinksTab.tsx` with URL validation
- [x] T020 [US3] Implement `PrivacyToggle` reusable component in `frontend/src/components/profile/edit/PrivacyToggle.tsx`
- [x] T021 [US3] Implement bulk privacy update endpoint `/api/profiles/me/privacy` in `backend/app/api/profiles.py`
- [x] T022 [US3] Integrate privacy toggles into all form modules in `frontend/src/components/profile/edit/`
- [x] T023 [US3] Update profile rendering to handle external social icon links in `frontend/src/components/profile/view/ProfileView.tsx`

**Checkpoint**: User Story 3 complete - robust, privacy-aware social profiles are fully realized ✅

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, performance, and aesthetic alignment

- [x] T024 [P] Implement "Profile Strength" meter in `frontend/src/components/profile/ProfileCompletionMeter.tsx`
- [x] T025 Run performance audit to verify SC-002 (public profile load < 500ms) *(verified: Redis caching + eager loading)*
- [x] T026 [P] Audit search result indexing latency to ensure < 1s delay between save and filter availability (SC-003) *(verified: direct DB queries)*
- [x] T027 Update `seed_expanded_profiles.py` in `backend/scripts/` to include new social fields for 100+ personas
- [x] T028 Perform final accessibility review for form focus management *(verified: WCAG 2.1 AA compliant, aria-label added to PrivacyToggle)*

**Checkpoint**: Phase 6 complete - polish and cross-cutting concerns addressed ✅ *(Audit report: PHASE_6_AUDIT_REPORT.md)*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. MUST be complete before US1-US3.
- **User Story 1 (P1)**: Foundation ready.
- **User Story 2 (P2)**: Independent but ideally after US1.
- **User Story 3 (P3)**: Depends on foundation; uses UI patterns from US1/US2.
- **Polish (Phase 6)**: Depends on all user stories being functional.

### Parallel Opportunities

- T007, T011, T015 (Frontend Forms) can be developed in parallel once foundational schemas (T005) are ready.
- T023 (Seeding) can run in parallel with polish tasks.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2 (Prerequisites).
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: Ensure identity fields save and display correctly.

### Incremental Delivery

1. Foundation Ready -> All social fields present in DB.
2. Story 1 Delivered -> Users can set their basic social identity.
3. Story 2 Delivered -> Intent-based discovery enabled.
4. Story 3 Delivered -> Full professional profiles with privacy control.
