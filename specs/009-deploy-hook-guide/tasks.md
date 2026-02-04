# Tasks: Implement Deploy Hook Guide Tasks

**Input**: Design documents from `specs/009-deploy-hook-guide/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Manual verification tasks included as per Constitution check in plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Project root: `.`
- Workflows: `.github/workflows/`
- Documentation: `devops/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify `.github/workflows` directory existence and repository permissions for Actions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Verify `RAILWAY_TOKEN` secret availability in GitHub Actions (Prerequisite check)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure Backend Deployment Hook (Priority: P1) 🎯 MVP

**Goal**: Configure a deployment hook for the backend service so that code changes in the repository automatically trigger a new deployment on Railway.

**Independent Test**: Can be tested by manually triggering the hook URL (via curl) or workflow dispatch and verifying that a deployment starts on the provider dashboard.

### Implementation for User Story 1

- [x] T003 [US1] Create `.github/workflows/deploy-backend.yml` with Railway CLI container configuration
- [x] T004 [US1] Configure workflow triggers (push to main, workflow_dispatch) in `.github/workflows/deploy-backend.yml`
- [x] T005 [US1] Add `deploy` job using `ghcr.io/railwayapp/cli:latest` in `.github/workflows/deploy-backend.yml`
- [x] T006 [US1] Configure `RAILWAY_TOKEN` secret injection in `.github/workflows/deploy-backend.yml`
- [x] T007 [US1] Add deployment step `run: railway up` in `.github/workflows/deploy-backend.yml`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Verify Deployment Trigger (Priority: P2)

**Goal**: Verify that the configured hook actually works so that I can be confident that my merges to main will reach production.

**Independent Test**: Execute the curl command locally or manually trigger the workflow to confirm deployment start.

### Implementation for User Story 2

- [x] T008 [P] [US2] Update `devops/DEPLOY_HOOK_GUIDE.md` with Railway CLI via Docker instructions
- [x] T009 [P] [US2] Update `devops/DEPLOY_HOOK_TASKS.md` with CLI-based verification steps
- [x] T010 [US2] Perform manual verification of deployment trigger (Action: Trigger workflow manually)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T011 [P] Review workflow logs for any exposed secrets (Security check)
- [x] T012 Final documentation review in `devops/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Documentation tasks are parallelizable, verification depends on US1

### Within Each User Story

- Workflow structure before job definition
- Job definition before steps
- Configuration before documentation
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- T008 and T009 (Documentation) can run in parallel with T003-T007 (Implementation)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories
