# Tasks: Moderation Warning System (Issue #65)

**Input**: `specs/014-moderation-warning-system/plan.md`
**Prerequisites**: plan.md (required)

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

**⚠ Local test DB safety note**: `backend/tests/conftest.py`'s `TEST_DATABASE_URL` is derived via `settings.DATABASE_URL.replace("/bgc_replica", "/bgc_test_db")`. Our `backend/.env` `DATABASE_URL` points at Supabase with DB name `postgres`, not `bgc_replica`, so that replace is a silent no-op — running `pytest` with the checked-in `.env` as-is would run the suite (and its `DROP SCHEMA public CASCADE` teardown) directly against the **shared production database**. CI avoids this by overriding `DATABASE_URL`/`REDIS_URL` to local services (see `.github/workflows/backend-ci.yml`). Always override both env vars to local/throwaway containers before running `pytest` locally, e.g.:
```bash
docker run -d --name bgc-test-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=test_db -p 15433:5432 postgres:17
docker run -d --name bgc-test-redis -p 16379:6379 redis:7
DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:15433/test_db" \
REDIS_URL="redis://localhost:16379/0" \
pytest
```

---

## Phase 1: Data Model

- [x] T001 Create `Warning` model (`user_warnings` table) in `backend/app/models/moderation.py`
- [x] T002 Create Alembic migration `backend/alembic/versions/h2i3j4k5l6m7_add_user_warnings.py` (`down_revision="g1h2i3j4k5l6"`) — verified upgrade/downgrade against throwaway local Postgres 17 container

**Checkpoint**: `alembic upgrade head` applies cleanly, `user_warnings` table exists.

---

## Phase 2: Foundational (Settings, Email, Test Infra)

- [x] T003 [P] Add `WARNING_ESCALATION_THRESHOLD` and `WARNING_ESCALATION_SUSPEND_HOURS` to `backend/app/core/config.py`
- [x] T004 [P] Add `send_warning_email()` to `backend/app/services/email_service.py`
- [x] T005 Add `send_warning_email_task` to `backend/app/services/tasks.py` (depends on T004)
- [x] T006 [P] Add `test_admin_user`/`admin_auth_headers` fixtures to `backend/tests/conftest.py` (no admin fixture existed before)

**Checkpoint**: email/config pieces are independently testable with mocked Resend.

---

## Phase 3: Core Service Logic

- [x] T007 Add `IssueWarningRequest`, `WarningItem`, `WarningListResponse`, `RevokeWarningRequest` schemas to `backend/app/schemas/admin.py`
- [x] T008 Implement `warning_service.issue_warning()` in `backend/app/services/warning_service.py` — creates `Warning` row, computes active count, applies escalation (suspend fields + `AUTO_SUSPEND_ESCALATION` log entry), writes `WARN_USER` `AdminActionLog` entry, dispatches `send_warning_email_task.delay()` (depends on T001–T007)
- [x] T009 Unit tests for `issue_warning()` in `backend/tests/test_warnings.py` — 7/7 passing against an isolated local Postgres+Redis container pair (not the shared Supabase DB; see note below)

**Checkpoint**: escalation logic fully unit-tested in isolation before any endpoint exists.

---

## Phase 4: Admin API Endpoints

- [x] T010 `POST /api/admin/users/{user_id}/warnings` in `backend/app/api/admin.py` (`deps.get_admin_user`, `Rate(10, Duration.MINUTE)`)
- [x] T011 `GET /api/admin/users/{user_id}/warnings` in `backend/app/api/admin.py` (pagination/status filter, mirrors `get_action_logs`)
- [x] T012 `POST /api/admin/users/{user_id}/warnings/{warning_id}/revoke` in `backend/app/api/admin.py`
- [x] T013 Integration tests in `backend/tests/test_warnings.py`: 403 for non-admin, pagination/status filtering, revoke excludes from active count — 14/14 passing

**Checkpoint**: direct warning issuance/history/revoke fully functional via API.

---

## Phase 5: Report-Driven Warnings

- [x] T014 Add `_resolve_report_target_user_id()` helper to `backend/app/api/moderation.py` (resolves author for `THREAD`/`POST`/`STATUS` reports, direct for `USER`)
- [x] T015 Wire `resolve_report`'s `warn_user` branch to `warning_service.issue_warning()` in `backend/app/api/moderation.py`
- [x] T016 Test in `backend/tests/test_warnings.py`: `resolve_report(action="warn_user")` on a `STATUS`-type report warns the author, not the reporter, and `USER`-type reports warn the target directly — 16/16 passing

**Checkpoint**: both warning entry points (direct + report-resolution) converge on the same shared logic.

---

## Phase 6: Frontend Data Layer

- [x] T017 [P] Add `WarningItem`, `WarningListResponse`, `IssueWarningRequest`, `RevokeWarningRequest`, `IssueWarningResponse` types to `frontend/src/types/admin.ts`
- [x] T018 Add `getUserWarnings`, `issueWarning`, `revokeWarning` to `frontend/src/services/adminService.ts` — `tsc --noEmit` clean

---

## Phase 7: Frontend UI

- [x] T019 [P] Build `WarningEscalationMeter` (sm/md/lg variants, amber→orange→destructive ramp) in `frontend/src/components/admin/WarningEscalationMeter.tsx`
- [x] T020 [P] Build `WarningHistoryList` (border-accent rows, empty state, "Triggered Suspension" badge) in `frontend/src/components/admin/WarningHistoryList.tsx`
- [x] T021 Extend `ActionType` with `"warn"`, add Issue Warning button + dialog branch with escalation preview block in `frontend/src/app/(protected)/admin/users/[id]/page.tsx`
- [x] T022 Wire `WarningHistoryList`/`WarningEscalationMeter` into the page's `fetchData()` `Promise.all`
- [x] T023 Toast copy update for `warn_user` resolution in `frontend/src/app/(protected)/admin/moderation/page.tsx`. Scope note: skipped the `sm`-badge in the queue rows — it would need a `reported_user.active_warning_count` field added to the backend's `ReportedUserInfo` schema, which is outside this plan's approved File-by-File List (backend schema changes were scoped to `admin.py`'s warning endpoints only). Flagging as a reasonable follow-up, not doing it as unplanned scope creep.

**Checkpoint**: full warning flow usable end-to-end from both admin UI entry points.

---

## Phase 8: Verification

- [x] T024 Extend `frontend/tests/e2e/admin.spec.ts` with a `Warnings` describe block, plus a "Warn User" check in `Moderation Queue` — ran against a real Playwright/Chromium instance (installed locally), all 5 new/touched tests skip gracefully via the file's existing redirect-to-login guard when no authenticated admin session is present, matching every other test in this file
- [x] T025 Full backend suite: `pytest` (regression check, including `test_api_contract.py` schemathesis pass against new endpoints) — 267 passed, 3 pre-existing unrelated failures confirmed present on clean `main` too (`test_health`, `test_create_post_flow`, `GET /metrics` contract test — all flaky/pre-existing, not caused by this work)
- [x] T026 Frontend: `tsc --noEmit` clean, `npm run lint` clean (one pre-existing unrelated warning in `thread-list.tsx`)
- [x] T027 Manual verification, split into two parts since production DB access for creating a superuser was correctly denied by the permission classifier (not authorized in advance): (1) **Backend + real infra**: migration applied cleanly to Supabase (additive-only, upgrade/downgrade both verified beforehand against a throwaway Postgres 17 container), backend booted against real Supabase+Railway Redis and `/health` returned 200. (2) **Full flow + visual verification**: repointed backend at fully isolated local Postgres/Redis containers (zero production risk), seeded throwaway test admin/target users there, ran backend+frontend dev servers, and used a temporary unauthenticated preview route (`/dev-preview-warnings`, deleted after use) to render `WarningEscalationMeter` (sm/md/lg) and `WarningHistoryList` with representative data (0/1/2/3-of-3 states, empty/active/revoked/triggered-suspension) in a real browser — confirmed correct rendering and the amber→orange→destructive escalation ramp in both light and dark mode via screenshots. All throwaway containers, processes, and the preview route were removed afterward. The 16 automated tests (T009/T013/T016) already cover the actual issue-3-warnings-then-auto-suspend flow end-to-end via real HTTP requests through the FastAPI test client.
