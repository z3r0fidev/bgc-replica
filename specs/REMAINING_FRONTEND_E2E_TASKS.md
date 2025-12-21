# Remaining Tasks: Frontend E2E Testing

The following tasks represent the Frontend E2E testing suite that has been deferred or reverted. These tasks should be implemented to ensure full coverage of the core user stories across the application.

## Phase 1: Setup Auth & Foundation (Specs 001)

- [ ] **T014 [US1]**: Create E2E test for PWA manifest validation in `frontend/tests/e2e/pwa.spec.ts`
- [ ] **T021 [US2]**: Create E2E test for Google Login flow (mocked) in `frontend/tests/e2e/auth-google.spec.ts`
- [ ] **T022 [US2]**: Create E2E test for Email/Password Signup and Login flows in `frontend/tests/e2e/auth-credentials.spec.ts`
- [ ] **T040 [US2]**: Create E2E test for Sign Out and Protected Route redirection in `frontend/tests/e2e/auth-protection.spec.ts`
- [ ] **T029 [US3]**: Create E2E test for Passkey registration/login (mocked WebAuthn) in `frontend/tests/e2e/auth-passkey.spec.ts`

## Phase 4: Community Features (Specs 004)

- [ ] **T041**: E2E test for Forum posting in `frontend/tests/e2e/community-forums.spec.ts`
- [ ] **T042**: E2E test for Social Feed flow in `frontend/tests/e2e/community-feed.spec.ts`

## Phase 5: PWA Modernization & Performance (Specs 005)

- [ ] **T018**: E2E test for Deep-linking in `frontend/tests/e2e/pwa-deep-link.spec.ts`
- [ ] **T019**: E2E test for Share Target in `frontend/tests/e2e/pwa-share.spec.ts`

## Execution Instructions
These tests should be implemented using **Playwright**. Ensure the development servers (frontend and backend) are running or mocked appropriately before execution.
