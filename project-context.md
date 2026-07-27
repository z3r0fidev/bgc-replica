# Project Context: BGC Replica

**Project**: BGCLive Replica - Modern Social Networking Platform
**Stack**: Next.js 16 (App Router) + FastAPI + PostgreSQL + Redis
**Repository**: https://github.com/z3r0fidev/bgc-replica
**Documentation**: See `CLAUDE.md` for commands and architecture

## Project Overview

BGCLive Replica is a full-stack social networking platform inspired by community-driven social sites. It combines real-time communication, personals/dating features, forums, and rich user profiles with granular privacy controls.

### Core Features
1. **Authentication**: NextAuth v5 with Google OAuth and JWT-based session management
2. **Two-Factor Authentication**: TOTP-based 2FA with QR codes, backup codes, and authenticator app support
3. **Email Verification**: Token-based verification with Resend email service and async delivery
4. **User Profiles**: Comprehensive identity, lifestyle, professional, and social data with field-level privacy
5. **Forums**: Threaded discussions with categories and real-time commenting
6. **Chat**: Real-time messaging via Socket.io
7. **Search & Discovery**: Advanced filtering by profile attributes, interests, and intent
8. **Moderation**: Admin queue for reviewing reports with filtering, stats, and bulk actions
9. **Notifications**: Granular notification preferences with email digest options

**Note**: The Personals feature has been extracted to a standalone subproject at `bgc-personals/` (see Subprojects section below).

## Architecture

### Technology Stack

#### Frontend
- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS, shadcn/ui components
- **State**: Zustand for global state, React hooks for local state
- **Forms**: React Hook Form + Zod validation
- **Rich Text**: Tiptap editor with extensions
- **Real-time**: Socket.io client
- **Storage**: Supabase Storage for media uploads

#### Backend
- **Framework**: FastAPI (Python 3.12+)
- **ORM**: SQLAlchemy 2.0 with async support
- **Database**: PostgreSQL with Alembic migrations
- **Cache**: Redis for sessions and rate limiting
- **Real-time**: Socket.io server
- **Validation**: Pydantic schemas
- **Monitoring**: Sentry for error tracking and performance

#### Infrastructure
- **Reverse Proxy**: Next.js rewrites for API routing
- **Authentication**: Shared `NEXTAUTH_SECRET` between frontend and backend
- **Storage**: Supabase for object storage (images, videos)
- **Deployment**: Ready for containerization (Docker)

### Directory Structure

```
bgc-replica/
├── frontend/                 # Next.js application (port 3000)
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (auth)/      # Auth flow pages
│   │   │   ├── (protected)/ # Authenticated pages
│   │   │   └── (forums)/    # Forum pages
│   │   ├── components/      # React components
│   │   │   ├── chat/        # Chat UI
│   │   │   ├── feed/        # News feed
│   │   │   ├── forums/      # Forum components
│   │   │   ├── profile/     # Profile components
│   │   │   └── ui/          # shadcn/ui primitives
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and validations
│   │   ├── services/        # API client services
│   │   ├── store/           # Zustand stores
│   │   └── types/           # TypeScript definitions
│   └── tests/
│       ├── unit/            # Vitest unit tests
│       └── e2e/             # Playwright E2E tests
├── backend/                 # FastAPI application (port 8000)
│   ├── alembic/            # Database migrations
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   ├── core/           # Config, DB, Redis
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── scripts/            # Utility scripts (seeding, etc.)
│   └── tests/              # Pytest tests
├── bgc-personals/          # Standalone Personals subproject
│   ├── frontend/           # Next.js app (port 3001)
│   ├── backend/            # FastAPI app (port 8001)
│   ├── specs/              # Personals specifications
│   └── README.md           # Personals documentation
└── specs/                  # Feature specifications
    ├── 001-*/              # Spec directories
    ├── ...
    └── 013-profile-expansion/
```

### Key Design Patterns

#### API Communication
- Frontend → Backend: Next.js rewrites (`/api/*` → `http://127.0.0.1:8000/api/*`)
- Authentication: JWT tokens validated on backend using shared secret
- Error Handling: Sentry integration on both frontend and backend

#### Privacy Model
- Field-level privacy settings stored in JSONB column (`privacy_settings`)
- Three levels: PUBLIC, FRIENDS_ONLY, PRIVATE
- Enforced by `ProfileService.mask_profile()` before serialization
- Client-side masking for immediate UI feedback

#### Real-time Features
- Socket.io for bidirectional communication
- Namespaces: `/chat`, `/comments`, `/presence`
- Authentication via JWT in connection handshake

#### Testing Strategy
- **Unit Tests**: Component logic (Vitest), API endpoints (pytest)
- **Integration Tests**: API workflows with test database
- **E2E Tests**: Critical user flows (Playwright)
- **Coverage**: Aim for >80% on business logic

## Current Development Status

### Completed Specifications & Feature Phases
1. **Spec 001-009**: Core platform features (auth, profiles, forums, chat)
2. **Spec 013**: Profile Expansion (identity, lifestyle, professional, privacy controls)
3. **Security Features** (2026-01-29):
   - Two-Factor Authentication (TOTP) with backup codes
   - Email Verification with Resend integration
   - Password Reset flow
4. **Moderation Features** (2026-01-29):
   - Admin moderation queue with filtering and bulk actions
5. **User Preferences** (2026-01-29):
   - Notification preferences with email digest options
6. **Production Readiness** (2026-01-30):
   - Deployment configurations for Railway and Vercel
   - Rate limiting on all high-traffic endpoints
   - Security headers and caching strategies
7. **Group Communication** (2026-01-30):
   - Group chats with API, schemas, frontend service
   - Real-time group messaging support
8. **Trust & Safety** (2026-01-30):
   - Verification badges system
   - Audit logging service
   - Auth activity tracking
9. **Progressive Web App** (2026-01-30):
   - Offline mode support
   - Enhanced install prompts
   - Network status detection
10. **Admin Dashboard & Performance Optimization** (2026-02-04, PR #5, commit 4d6f0b1):
    - GZipMiddleware for response compression
    - Sentry sampling rate tuned to 10%
    - Redis caching for block IDs (5-min TTL) and friendship status (10-min TTL)
    - Admin dashboard: user management, suspend/ban/restore, search, pagination
    - Analytics dashboard with DAU/WAU/MAU charts (Recharts)
    - System health monitoring (DB + Redis stats, auto-refresh)
    - Batch comments endpoint (eliminates N+1 queries on feed)
    - Virtual scrolling in chat window (@tanstack/react-virtual)
    - New UI components: Progress, Separator, Table
    - E2E test suite for admin features
11. **asyncpg Encoding Hardening / CI/CD End-to-End** (2026-07-01, PR #41 + PR #42):
    - Discovered asyncpg uses 3 different encoding paths by column type (String, ARRAY(String), JSONB)
    - `backend/app/schemas/base.py`: `SafeBaseModel` + `_assert_safe_string` — rejects NUL bytes and lone surrogates at Pydantic layer
    - All write schemas across profile, community, chat, group_chat, story switched to `SafeBaseModel`
    - Inline JSONB dict validation in `profiles.py::update_privacy_settings`
    - Global `SQLAInterfaceError` + `UnicodeError` handlers added to `main.py`
    - Fixed return-value bug in `_assert_safe_string` (was returning None)
    - Backend CI, PR Validation, and Deploy Backend (Railway) all passing end-to-end
    - 24 stale workflow runs cleaned up from GitHub Actions
12. **SafeBaseModel Audit Completion + E2E Reliability** (2026-07-01, PR #43, commit a8e7a7c):
    - Remaining write schemas migrated: `admin.py` (SuspendUserRequest, BanUserRequest, UpdateUserRequest), `gallery.py` (AlbumCreate, AlbumUpdate), `notification.py` (NotificationPreferencesUpdate)
    - JSONB dict coverage closed: `profile.py::validate_social_links` now validates all unknown keys/URL values; `group_chat.py::GroupChatUpdate` field_validator walks `settings` dict
    - SafeBaseModel coverage is now complete across ALL write schemas in the backend
    - E2E reliability: `chat-virtual-scroll-stress.spec.ts` stress tests skip in CI via `test.skip(!!process.env.CI)`; `auth-google.spec.ts` replaced unbounded 30s `waitForRequest` with 5s timeout + null-safe branches
    - Railway CLI upgraded to v5.23.3 (new: `railway logs`, `railway restart`, stateless `--project` flag)
13. **Deploy Frontend Vercel Path Fix + CI Gate Hardening** (2026-07-01, PR #44, merge commit 7676fa2):
    - Root cause: `deploy-frontend.yml` set `working-directory: ./frontend` on Vercel CLI steps; Vercel resolved path as `frontend/frontend` (double-nesting against dashboard Root Directory = `frontend`)
    - Fix: removed `working-directory: ./frontend` from `vercel pull`, `vercel build --prod`, and `vercel deploy --prebuilt` steps; CLI now runs from repo root
    - Bonus: `workflow_dispatch` trigger added to `frontend-ci.yml`
    - Bonus: `.github/workflows/**` added to `frontend-ci.yml` path filter — workflow-only PRs now auto-trigger `quality-check`
    - CI gate discovery: `workflow_dispatch` runs do NOT satisfy branch protection required checks; only `pull_request`-triggered runs count
14. **Deploy Frontend End-to-End Confirmation** (2026-07-01, PR #45, merge commit 9e6527e):
    - Smoke-test PR: added `1440` to `deviceSizes` in `frontend/next.config.ts` to trigger a real frontend deploy
    - Both `quality-check` and `deploy` jobs in Deploy Frontend passed (GitHub Actions run ID 28516698586)
    - Confirms the PR #44 Vercel path fix is working correctly in production
15. **PRs #46-#54** (2026-07-02, various): E2E timeout sharding fix, CODECOV/SENTRY token wiring,
    nightly stress-test workflow, E2E deployment targeting fix, community-feed/gallery-albums mock
    data shape fixes, admin route protection at the edge middleware layer, fastapi pinned <0.137.0
    to avoid an `_IncludedRouter` regression. See `git log --merges 9e6527e..656a523` for exact commits.
**Bridging note — PR #84** (2026-07-12/13, merge `89d8464`): `docs: update env.md Redis guidance
from Upstash to Railway` — closed the stale Upstash reference (line 95) flagged by the 2026-07-12
local-dev-repair session below; docs now correctly point at Railway. Docs-only, no code affected.

17. **Moderation Warning System** (2026-07-13, PR #85, merge `583d7e0`, feature commit `1f52f06`,
    closes #65): full plan → implement → verify → merge cycle.
    - New `user_warnings` table (dedicated, not folded into `admin_action_logs`) for fast
      escalation-count queries. `WARNING_ESCALATION_THRESHOLD` (default 3) auto-suspends via the
      same fields `suspend_user` sets; `WARNING_ESCALATION_SUSPEND_HOURS` (default 168h) controls
      duration.
    - Two issuance paths — report-resolution's `warn_user` action (previously a stub) and a new
      direct "Issue Warning" admin action — both funnel through `warning_service.issue_warning()`.
    - Fixed a related pre-existing bug: `resolve_report`'s `warn_user`/`ban_user` had no way to
      resolve a target user for non-`USER` report types (`THREAD`/`POST`/`STATUS`); added
      `_resolve_report_target_user_id()`.
    - Email notification via the existing Resend/Celery pattern (`send_warning_email_task`).
    - New frontend: `frontend/src/components/admin/WarningEscalationMeter.tsx` (amber→orange→
      destructive ramp, reusing existing Suspended/Banned status colors) and
      `WarningHistoryList.tsx`.
    - 22 new backend tests (`backend/tests/test_warnings.py`), Playwright E2E additions in
      `admin.spec.ts`, migration verified against a throwaway Postgres 17 container before applying
      to production Supabase.
    - Full spec at `specs/014-moderation-warning-system/` (27/27 tasks complete).
18. **Celery Worker Production Incident Fix** (2026-07-13, PR #86 merge `6f2ff6e`/commit `5964c28`,
    PR #87 merge `5bcd5b9`/commit `f8f5c81`): discovered while starting to plan #66 — Celery had
    **never run in production**, only the web Railway service (`bgc-replica`) existed. Every
    `.delay()`'d task (verification/reset/warning emails, feed fan-out) was queuing into Redis and
    never executing (`LLEN celery` stuck non-zero, non-draining).
    - Created a new `celery-worker` Railway service; added `backend/start.sh`, which branches on
      Railway's auto-injected `RAILWAY_SERVICE_NAME` env var to run the correct process per service
      (a dashboard Custom Start Command is silently overridden by `railway.json`'s checked-in
      `startCommand`, undocumented behavior). Deleted the now-fully-dead `backend/Procfile`.
    - `railway.json`'s `healthcheckPath: /healthz` was being applied to `celery-worker` too (no HTTP
      server), failing every deploy after 11 failed retries over 5 minutes despite the worker
      process itself running correctly. Removed `healthcheckPath`/`healthcheckTimeout` from the
      shared config (no per-service conditional config exists in `railway.json`).
    - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL` were never set in Railway production at all
      (only in local `.env`) — set on both services via `railway variable set`.
    - Verified end-to-end: `celery-worker` deploy `SUCCESS`, full task registry in logs, `LLEN
      celery` drained 1 → 0.
    - **Known open gap**: Resend reports `bgclive.online` domain not verified — real sends still
      blocked pending DNS verification in the Resend dashboard (not a code issue).
19. **Issue #66 (DB Partitioning) — investigated, implementation paused** *(status as recorded on
    2026-07-13; superseded the very next day — see item 20 below, backfilled 2026-07-15)*: a
    database-optimizer agent pass plus direct verification found `messages` was partitioned by
    `created_at` in December 2025 but monthly-partition-creation automation was never built — every
    message since January 2026 has landed in a single `messages_default` catch-all, defeating the
    point. The same migration also silently dropped FK constraints
    (`room_id`/`conversation_id`/`sender_id`) and `ix_messages_sender_id` on `messages`, never
    restored *(PR #89's commit message states this specific FK/index concern was re-investigated
    during implementation and found already fixed by an unrelated earlier migration by that point;
    this session's own `git log --follow` on the migration file could not independently confirm a
    point where the FK/index lines were absent, so the discrepancy is noted rather than resolved)*.
    `status_updates` was never partitioned. Hot-path queries (chat by `conversation_id`/`room_id`;
    feed via Redis fan-out + `id IN (...)`) don't filter by date, so partitioning won't speed up
    per-query latency — value is in maintenance/vacuum at scale and future retention/archival. User
    informed and agreed to proceed with full scope once resumed. **No plan file was written to
    `specs/`** — work paused when the Celery incident took priority. Resuming requires
    re-investigation, not resuming a saved artifact.

### Bridging — PRs #89-#109 (2026-07-13/14, backfilled 2026-07-15 — see `session-context.md` for full detail)

**A large body of work landed on `main` across these two days without ever being written into this
file until this 2026-07-15 close-out.** Discovered via `git log 5bcd5b9..3a3ef47` while closing the
2026-07-15 session; reconstructed from commit messages/diffs, not a live transcript.

20. **Issue #66 (DB Partitioning) — completed** (PR #89 `8784fbe`/commit `c7000ec`, closes #66; PR
    #90 `1b2a025`/commit `c148a52`, follow-up bug fix). Directly supersedes item 19 above: fixed the
    `messages_default` catch-all via a generic `create_monthly_partition()` Postgres function shared
    by the migration and test fixtures (`app/core/partitioning.py`), a weekly Celery Beat task
    keeping both tables' partitions ahead of need, and a manual/supervised
    `backend/scripts/backfill_messages_partitions.py` for redistributing already-mis-routed rows
    (not confirmed run against production as of 2026-07-15). `status_updates` is now partitioned too.
    PR #90 fixed a real follow-up bug: the new weekly task reused the app's shared DB engine
    singleton from inside its own event loop, breaking on a worker's second invocation — fixed via a
    new `create_scoped_engine()` helper. New spec: `specs/015-postgres-partitioning/`.
21. **Three real production bugs found via test-coverage work, fixed in place**:
    - **Chat router never mounted** (PR #91 `5face22`/commit `0191bb5`): `app/api/chat.py` was
      defined but never registered in `main.py` — every chat endpoint the frontend calls had been
      404ing in production. Fixed with a 2-line `main.py` change; `chat.py` coverage 0% → 91%.
    - **Group chats broken** (PR #94 `99843ba`/commit `cd9e94a`): `not GroupMessage.is_deleted`
      compiled to a literal SQL `WHERE false` (Python `not` on a SQLAlchemy column, not a query
      predicate), so message history/replies always returned empty/404; and
      `user.profile.avatar_url` crashed with `MissingGreenlet` (unloaded relationship) and was wrong
      anyway (`Profile` has no `avatar_url` — real avatar is `User.image`).
    - **Android sessions misreported as OS "Linux"** (PR #95 `2e3dfe7`/commit `79d79b9`):
      `session_service.py`'s OS-detection pattern list checked `"Linux"` before `"Android (\d+)"`,
      and real Android UAs always contain `"Linux;"`.
22. **Coverage-measurement bug fixed** (PR #93 `552e22d`/commit `6417b3f`, found while adding
    `admin.py` tests): `coverage.py`'s default tracer under-reports lines that run after a real
    `await` suspension later in the same async function. Added `backend/.coveragerc` (`core =
    sysmon`, Python 3.12's PEP 669 tracer) — no code change, but real backend coverage jumped from a
    previously-assumed 63% to **71%**, already above `codecov.yml`'s 60% project gate. Any coverage
    percentage cited elsewhere in this file from before 2026-07-14 may understate real coverage for
    files with sequential `await`s.
23. **Backend service test coverage added** (PR #92, #96-#102, each a dedicated new test file for a
    previously-untested/under-tested module): `socket_config.py` (43 tests), `totp_service.py` +
    2FA API (45 tests), `location.py` (11 tests), `password_reset_service.py` (23 tests),
    `verification_service.py` (22 tests), `moderation_service.py` (12 tests), `storage.py` (9 tests),
    `media_processor.py` (59 tests).
24. **Frontend unit test coverage initiative began** (frontend was ~5% overall per PR #103's
    description): PR #103 `src/services/` (11 API client files — also where a stale duplicate
    `forums.test.ts` was superseded by `forums-service.test.ts`; a leftover untracked copy of the
    old file was found and deleted during the 2026-07-15 session close-out, see below), PR #104
    `src/store/` (33 tests), PR #105 `src/hooks/` (86 tests, 9 files), PR #106 chat/forums/feed/auth
    components (66 tests), PR #107 `src/components/ui/` primitives (155 tests, 22 components), PR
    #108 gallery/admin/moderation/pwa/layout components (14 new test files), PR #109
    `src/components/profile/` (126 tests, 13 components).

### 2026-07-15 — `src/app/` Page-Level Test Coverage Initiative Complete (PRs #110-#113, #114)

25. **Frontend page-level coverage, in 4 PRs**: #110 (`5e23772`, auth pages + infra routes), #111
    (`3bf6fc6`, chat/forums/media pages), #112 (`b84f460`, admin/settings/profile pages), #113
    (`3a3ef47`, squash-merged, gallery/groups/social pages — closes out essentially all remaining
    `src/app/` page coverage). #114 (`bf61571`) was a small standalone tsc fixture-typing fix that
    landed between #112 and #113. Two gaps left intentionally uncovered per #113's own description
    (not TODOs): `feed/page.tsx` (90.9%, virtualizer internals mocked per repo convention) and
    `topical/[slug]/page.tsx` (82.4%, data-fetch is a hardcoded-empty-array stub pending a real
    endpoint).
26. **Session close-out cleanup**: found and deleted a stale untracked
    `frontend/tests/unit/forums.test.ts` — byte-identical to the version deliberately deleted in PR
    #103's commit `4bb8dde` (it tested a locally-reimplemented `buildTree()` instead of the real
    module). Never tracked in git; plain `rm`, nothing to stage.
27. **Documentation gap discovered and backfilled**: this file, `session-context.md`,
    `conversation-context.md`, and `session-summary.md` had not been updated since the 2026-07-13
    doc-close (PR #88) despite 24 more PRs (#89-#112) landing in the interim — see items 20-24 above,
    reconstructed from `git log`/`git show` during this close-out rather than a live transcript.

### 2026-07-16 — Messages Partition Restore Fix (PR #115) + Backend API Endpoint Coverage (PR #116)

Closes both items the 2026-07-15 close-out had left unconfirmed: PR #89's FK/index claim, and the
real extent of backend `app/api/` route-handler test coverage.

28. **`messages` partitioning was silently broken since 2025-12-21 — now fixed** (PR #115, squash
    `3feaa0f`). Investigation: replaying every migration from a clean Postgres 17 container
    confirmed PR #89's commit-message claim was correct — the FK/index restoration for `messages`
    (`messages_room_id_fkey`, `messages_conversation_id_fkey`, `messages_sender_id_fkey`,
    `ix_messages_sender_id`) really is present, added by `96be264b314b_add_created_at_to_profile.py`
    (an autogenerated migration nominally about an unrelated column). But that same migration, as
    an unreviewed autogenerate side effect, also dropped `messages_default` and `messages_y2025m12`
    — alembic's autogenerate doesn't understand native Postgres declarative partitioning and saw
    those partitions as tables absent from SQLAlchemy metadata. Net effect, confirmed both via local
    replay and a direct read-only production query (user-approved): **`messages` has been a
    partitioned table with zero partitions attached in every environment, production included,
    since 2025-12-21** — any `INSERT` fails with "no partition of relation messages found for row."
    Undetected because production has zero real users/messages so far. `status_updates` does not
    have this problem (its own migration creates partitions inline). PR #115 adds migration
    `k5l6m7n8o9p0_restore_messages_partitions.py` (mirrors `status_updates`' approach); validated
    end-to-end locally (fresh-replay reproduction, insert routing, downgrade/upgrade idempotency,
    existing `test_partition_automation.py` suite). **Not yet applied to production** — needs a
    real deploy + `alembic upgrade head`.
29. **Backend `app/api/` route-handler coverage gap closed for 5 of 18 modules** (PR #116, squash
    `62167f5`): `block.py`, `forums.py`, `groups.py`, `notifications.py`, `stories.py` had zero
    endpoint-level tests (confirmed by cross-referencing all 18 route modules against
    `tests/*.py`). Adds `tests/test_block.py`, `tests/test_forums.py`, `tests/test_groups.py`,
    `tests/test_notifications.py`, `tests/test_stories.py` (53 tests), following the
    `tests/test_group_chats.py` convention. **Also fixed a real bug**: `GET /api/forums/tree`
    crashed with `MissingGreenlet` on any request where a forum category exists —
    `ForumCategoryTree.model_validate(cat)` read `cat.children`, a lazy-loaded relationship, outside
    an awaited context; fixed in `backend/app/api/forums.py` by validating against
    `ForumCategorySchema` and constructing `children=[]` explicitly (the endpoint already rebuilds
    the tree manually right after). Undetected because production has never had real forum
    categories populated. **Still open**: `verification.py` and `moderation.py` have only
    service-layer tests, not endpoint tests.
30. **Both PRs' local verification used a throwaway local Postgres 17 + Redis 7 in Docker**, not the
    checked-in `.env` (which points at production Supabase). One read-only query was run directly
    against the actual production database, specifically to confirm the zero-partition bug was real
    in production — done with explicit user approval, read-only only.

### 2026-07-16 (Session 2) — Frontend `src/lib` Coverage (PR #119/#120), Deploy Frontend CI Fix (PR #121), Backend Verification/Moderation API Coverage (PR #122)

A separate same-day session, after PR #118 (a docs-correction PR confirming PR #115's deploy) merged.

31. **Frontend `src/lib` coverage taken to 100% lines/functions** (PR #119 squash `3aa7fe2`, PR #120
    squash `e64108c`). `auth.ts`/`performance.ts`/`offline-storage.ts`/`prisma.ts` all had 0%
    coverage going in. PR #119 (three parallel staff-engineer subagents, independently re-verified):
    `auth.ts` (8 tests) mocks `next-auth`/`@auth/prisma-adapter`/provider factories to capture the
    real config/callbacks without a DB; locks in that the Credentials provider's `authorize()` is an
    unimplemented placeholder (always returns `null`). `performance.ts` (28 tests) covers all 13
    exports via `vi.useFakeTimers()` and hand-built `IntersectionObserver`/`matchMedia` mocks.
    `offline-storage.ts` (13 tests) needed a hand-built fake `indexedDB` (jsdom has none); found the
    `if (!this.db) return` guards in `saveFeed`/`getFeed` are dead code, documented not fixed. PR
    #120 (9 tests) covers `prisma.ts`'s import-time env-var branching and dev-mode global-instance
    caching via `vi.resetModules()` + dynamic `import()` per scenario. Also fixed a broken
    `frontend/node_modules/.bin/vitest` symlink this round (Synology Drive sync had flattened it into
    a real file copy) — see item 33 below.
32. **`Deploy Frontend`'s CI failures were a false alarm — production was never affected** (PR #121
    squash `36ecb13`). The workflow's `deploy` job (`vercel pull` → `vercel build --prod` → `vercel
    deploy --prebuilt`) had been failing on every push to `main` since PR #119 with `Error: Invalid
    rewrite found`, most likely because `NEXT_PUBLIC_API_URL` is flagged "Sensitive" in Vercel's
    dashboard, excluding it from CLI pulls run outside Vercel's own build infra. Confirmed via the
    Vercel API that this `deploy` job was pure duplicate effort the whole time: Vercel's native GitHub
    integration (`source: "git"`) was independently auto-building and deploying every push
    successfully, live on `www.bgclive.online`/`bgclive.online` throughout. PR #121 removed the
    redundant job entirely rather than fixing the CLI-side env var gap — see the new Key Decisions
    entry in `session-context.md` before ever re-adding a CLI deploy step to this workflow.
33. **Second Synology Drive sync corruption instance**: `backend/venv`, freshly created via
    `python3.12 -m venv venv` + `pip install`, came out with `pip`'s own vendored `_vendor` directory
    missing entirely — same root cause as the `frontend/node_modules/.bin/vitest` symlink flattening
    (item 31 above): both are rapid-many-small-file-write directories inside the Synology-synced repo
    folder. Worked around by building the venv outside the synced tree (a scratchpad directory); not
    committed anywhere, doesn't persist across sessions. Recommended (not yet actioned): exclude
    `frontend/node_modules/`, `backend/venv/`, and `frontend/.next/` from Synology Drive sync at the
    client level.
34. **Backend `app/api/` route-handler coverage gap fully closed** (PR #122 squash `cca5c04`):
    `verification.py`/`moderation.py` were the last two of 18 route modules with only service-layer
    tests, not endpoint tests — the gap PR #116 (2026-07-16, previous session) had flagged open.
    `tests/test_verification_api.py` (19 tests, all 4 routes) found via actual testing that auth
    (401) is checked before body validation (422) for `POST /{user_id}` — corrected a task-brief
    assumption. `tests/test_moderation_api.py` (47 tests, all 8 routes) found and documented (not
    fixed) a likely real bug: `GET /stats`'s `resolved_today` field filters by `created_at`, not an
    actual resolution timestamp (no such column exists on `ContentReport`), so a report resolved
    today but created earlier is not counted. Verified against isolated local Postgres/Redis Docker
    containers, never the checked-in `.env` (production Supabase). Full suite: 662 passed, 1 xfailed,
    zero regressions; confirmed `ruff check .` (not `flake8`) is this repo's actual CI linter —
    `CLAUDE.md`'s documented `black . && flake8 .` command is stale.
35. **All four branches** (`test/lib-coverage-auth-performance-offline-storage`,
    `test/lib-prisma-coverage`, `fix/remove-redundant-deploy-job`,
    `test/verification-moderation-api-coverage`) **deleted (local + origin)** after merge.

### 2026-07-26 — CSP Phase 2 (PR #128), Distributed Tracing via Sentry (PR #129), Spec 015 Phase 7 Verification (PR #130), Repo Cleanup

**Bridging note**: this file's numbered list last updated through item 35 (PR #122, 2026-07-16).
Two intervening sessions — PR #124 (docs: fix stale backend lint command in `CLAUDE.md`) and PR
#125/#126 (CSP Phase 0: violation-detection E2E coverage + Sentry forwarding; CSP Phase 1:
nonce-based `script-src`, Issue #68) — shipped without a project-context.md update. See
`conversation-context.md`/`session-summary.md` for their detail; not restated here.

36. **CSP Phase 2 — `style-src-elem`/`style-src-attr` split** (Issue #127, opened and closed this
    session; PR #128 squash `ebc0347`). `style-src-elem` is now nonce-restricted; `style-src-attr`
    stays permissive by necessity (Radix/Framer Motion/`@tanstack/react-virtual`/`@dnd-kit` set
    inline `style` *attributes* via JS at runtime — no nonce/hash source can ever cover attribute
    values, only element sources). Fixed two real bugs, not just a header flip: sonner@2.0.7's
    `Toaster` CSS-injection pattern (empty `<style>` connected to `<head>` first, filled afterward —
    unfixable by nonce/hash because Chromium validates once, at the empty state) via a new
    `patch-package` patch (`frontend/patches/sonner+2.0.7.patch`); and a `STYLE_ELEM_HASHES`
    allowlist in `frontend/src/proxy.ts` for other static JS-injected `<style>` elements with no
    nonce API (Radix ScrollArea/Select viewports), hashes derived empirically against a real
    production build. CI surfaced two more real, pre-existing, preview-only issues: Vercel's own
    preview Toolbar/Live Feedback widget violating `frame-src` (fixed via the
    `VERCEL_PREVIEW_FEEDBACK_ENABLED=0` Vercel dashboard env var, not code) and a second
    `style-src-elem` violation on `/chat`/`/users` traced to React DOM's own `<style precedence>`
    Resource insertion path (same empty-then-filled pattern as sonner's, internal to React) — fixed
    by allowlisting the well-known SHA-256 hash of the empty string.
37. **Distributed tracing wired through Sentry, dead OpenTelemetry code removed** (Issue #72, PR #129
    squash `11266ce`). Closes Spec 007 task T008, which was checked off but didn't match reality —
    backend had a disconnected `TracerProvider`/`OTLPSpanExporter` gated behind an env var never set,
    pointed at an unreachable default collector; frontend had zero `@opentelemetry/*` packages. User
    chose Sentry (already fully configured both sides, auto-instruments FastAPI/Starlette/SQLAlchemy/
    Redis natively) over standing up OTel infra. Removed the dead OTel code/packages from
    `backend/app/main.py`/`backend/requirements.txt`. Fixed two real gaps: frontend's default
    `tracePropagationTargets` only covers same-origin requests, but `frontend/src/services/*.ts` call
    the Railway backend directly (added explicitly in `frontend/src/instrumentation-client.ts`); and
    backend `CORSMiddleware`'s `allow_headers` didn't include `sentry-trace`/`baggage`, stripping them
    on cross-origin preflight (fixed in `backend/app/main.py`). Verified end-to-end (forced
    `sentry-trace` sampling decision honored by Sentry; live Chromium session confirmed outgoing
    requests carry the headers), not assumed. Also fixed two pre-existing `ruff` BLE001 findings
    (intentionally-blind health-check excepts) with `# noqa` plus rationale.
38. **`ruff` pinned to `0.15.22` in CI** (same PR #129, same commit). Ruff 0.16.0 (unpinned `pip
    install ruff` in three workflows) had silently changed its default rule selection, surfacing 986
    pre-existing lint findings across untouched backend test files — confirmed via local diff between
    ruff versions against the identical tree. Pinned in `backend-ci.yml`, `pr-validation.yml`,
    `deploy-backend.yml`.
39. **Spec 015 (Postgres partitioning, Issue #66) Phase 7 rollout confirmed already complete in
    production** (PR #130 squash `b319b05`, docs-only). `specs/015-postgres-partitioning/tasks.md`
    had T025–T031 (the production rollout steps) fully unchecked. Read-only verification against
    production Supabase (explicit user approval obtained first) — `alembic_version` at the expected
    head, partition functions/tables present, `railway logs`/`railway status --json` confirming
    Celery Beat running — confirmed all of T025–T031 were already done, just never checked off in the
    spec. Checklist updated with evidence; zero code changes.
40. **Full repo cleanup**: deleted 30 local + 28 remote git branches (cross-referenced against `gh pr
    list --state all` first, since squash-merges don't register as ancestors for git's own
    `--merged` check) and 16 stale `.claude/worktrees/agent-*` worktrees/branches from earlier agent
    tool invocations. Only `main` remains, locally and on GitHub. **Repo state after this session:
    zero open issues, zero open PRs, all CI green on `main`, no other unchecked items across any
    `specs/*/tasks.md`.**

### Earlier — E2E CSP/Rate-Limit/CORS Hardening + Production DB Migration (2026-07-03, PR #55, merge commit b1a9e2e)
    - `frontend/next.config.ts` CSP `connect-src` allowlists `https://*.up.railway.app` /
      `wss://*.up.railway.app` — previously blocked Socket.io's `wss://` connection to the Railway
      backend in real deployments (confirmed via browser console CSP violations)
    - ~13 `fastapi-limiter` routes across auth/profiles/gallery/media/chat/forums/group_chats/search
      loosened ~4-6x for E2E's concurrent Playwright workers (was producing 78-181 429s per run);
      admin routes untouched
    - 8 E2E spec files' hardcoded `domain: 'localhost'` auth cookie fixed to resolve from `baseURL`
    - `backend/app/core/socket_config.py` + `app/core/config.py::is_allowed_origin`: added a
      Vercel-preview-origin regex check, backing both the Socket.io `connect()` handler and
      FastAPI's `CORSMiddleware allow_origin_regex` — static `CORS_ORIGINS` could never enumerate
      Vercel's per-deployment preview origins, causing 403s
    - `app/(protected)/profile/edit/page.tsx`: added `aria-label` to `TabsTrigger`s that had zero
      accessible name below 640px viewport width (breaking mobile E2E tab queries)
    - `app/(protected)/forums/[category]/page.tsx`: fixed a genuine production bug —
      `thread.author_id` doesn't exist in `ForumThreadSchema` (`author: {name, email, image}` does);
      would crash for every real user, not just tests
    - `(auth)/login/page.tsx`: 2FA code `<Input>` given `name="code"` + `aria-label` (had neither)
    - New: `frontend/src/app/share-target/route.ts` — implements the previously-incomplete PWA
      `share_target` manifest action (spec task T019)
    - **CRITICAL infrastructure fix**: production Supabase database backing Railway had never been
      migrated (zero tables in `public` schema) — ran `alembic upgrade head` directly against
      production (user-approved), all 33 tables now exist, verified live via curl
    - Diagnosed (not fixed, worked around) a Vercel platform limitation: "Protection Bypass for
      Automation" doesn't re-apply `next.config.ts`/`vercel.json` rewrites on the bypass redirect;
      `search-profile-filters.spec.ts` now hits `NEXT_PUBLIC_API_URL` directly to sidestep it
    - E2E health: ~384 tests near-total-failure → 60-73/65-76 passing per shard

### Recent Commits (chronological, newest first)
- **b319b05** (2026-07-26): docs: confirm Postgres partitioning Phase 7 rollout (Issue #66) is complete (#130, squash-merged)
- **11266ce** (2026-07-26): feat(observability): fix distributed tracing to route through Sentry (#129, squash-merged)
- **ebc0347** (2026-07-26): feat(csp): split style-src into style-src-elem (nonce) + style-src-attr (permissive) (#128, squash-merged)
- **4cc0385** (2026-07-2x): feat(csp): roll out nonce-based script-src, remove unsafe-inline/unsafe-eval (Issue #68, Phase 1) (#126, squash-merged)
- **bf31a85** (2026-07-2x): feat(csp): add violation-detection E2E coverage + wire Sentry forwarding (Issue #68, Phase 0) (#125, squash-merged)
- **82ab222** (2026-07-2x): docs: fix stale backend lint command in CLAUDE.md (#124)
- **f3b6589** (2026-07-2x): docs: close session — PR #119-#122 (src/lib coverage, Deploy Frontend CI fix, verification/moderation API coverage) merged (#123)
- **cca5c04** (2026-07-16): test: add endpoint coverage for verification and moderation APIs (#122, squash-merged)
- **36ecb13** (2026-07-16): fix(ci): remove redundant/broken CLI deploy job from Deploy Frontend (#121, squash-merged)
- **e64108c** (2026-07-16): test: add coverage for lib/prisma.ts (#120, squash-merged)
- **3aa7fe2** (2026-07-16): test: add coverage for lib/auth, lib/performance, lib/offline-storage (#119, squash-merged)
- **38dc6bc** (2026-07-16): docs: confirm PR #115's messages partition fix is deployed to production (#118)
- **547f452** (2026-07-16): docs: close session — PR #115 (messages partition fix) + PR #116 (API test coverage) merged (#117)
- **62167f5** (2026-07-16): test: add endpoint coverage for block, forums, groups, notifications, stories (#116, squash-merged)
- **3feaa0f** (2026-07-16): fix(db): restore messages_default and monthly partitions (Issue #66 follow-up) (#115, squash-merged)
- **3a3ef47** (2026-07-15): test: add coverage for gallery, groups, and social pages (#113, squash-merged)
- **bf61571** (2026-07-15): fix: annotate baseUser fixture with AdminUserDetail type (#114)
- **b84f460** (2026-07-15): test: add coverage for admin, settings, and profile pages (#112)
- **3bf6fc6** (2026-07-15): test: add coverage for chat, forums, and media pages (#111)
- **5e23772** (2026-07-15): test: add coverage for auth pages and infra routes (#110)
- **5b9b7c8** (2026-07-14): Merge pull request #108 test(components): gallery/admin/moderation/pwa/layout coverage
- **8a2bda6** (2026-07-14): Merge pull request #109 test(components): src/components/profile/ coverage
- **997962f** (2026-07-14): Merge pull request #107 test(components): src/components/ui/ primitives coverage
- **29d0ac2** (2026-07-14): Merge pull request #106 test(components): chat/forums/feed/auth components coverage
- **b3bd880** (2026-07-14): Merge pull request #105 test: src/hooks/ coverage
- **4ea8f69** (2026-07-14): Merge pull request #104 test: src/store/ Zustand coverage
- **7c89233** (2026-07-14): Merge pull request #103 test: src/services/ frontend API client coverage
- **f424849** (2026-07-14): Merge pull request #102 test: media_processor.py coverage
- **f495d32** (2026-07-14): Merge pull request #101 test: storage.py coverage
- **a8eb5fe** (2026-07-14): Merge pull request #100 test: moderation_service.py coverage
- **195e798** (2026-07-14): Merge pull request #99 test: verification_service.py coverage
- **c500a17** (2026-07-14): Merge pull request #98 test: password_reset_service.py coverage
- **76a4d87** (2026-07-14): Merge pull request #97 test: location.py coverage, harden search_users_nearby
- **668c6ea** (2026-07-14): Merge pull request #96 test: totp_service.py + 2FA API coverage
- **2e3dfe7** (2026-07-14): Merge pull request #95 fix: Android devices misreported as OS "Linux" in session device info
- **99843ba** (2026-07-14): Merge pull request #94 fix: group chat message history, replies, and member avatars were broken
- **552e22d** (2026-07-14): Merge pull request #93 test: admin.py coverage + fix systematic async coverage under-reporting (`.coveragerc` sysmon)
- **46947ae** (2026-07-14): Merge pull request #92 test: socket_config.py Socket.io handler coverage
- **5face22** (2026-07-14): Merge pull request #91 fix: mount chat router (was never registered, chat API 404ing in production)
- **1b2a025** (2026-07-14): Merge pull request #90 fix(tasks): ensure_future_partitions event-loop/shared-engine bug
- **8784fbe** (2026-07-14): Merge pull request #89 feat(db): fix broken messages partitioning, add automation, partition status_updates (closes #66)
- **c35d899** (2026-07-13): Merge pull request #88 docs: close session — warning system (#65), Celery production fix, DB partitioning (#66) paused
- **5bcd5b9** (2026-07-13): Merge pull request #87 fix(deploy): remove shared HTTP healthcheck blocking celery-worker deploys
- **6f2ff6e** (2026-07-13): Merge pull request #86 fix(deploy): route Celery worker start command via RAILWAY_SERVICE_NAME
- **583d7e0** (2026-07-13): Merge pull request #85 feat(moderation): implement warning system with email notifications (closes #65)
- **89d8464** (2026-07-12/13): Merge pull request #84 docs: update env.md Redis guidance from Upstash to Railway
- **b1a9e2e** (2026-07-03): Merge pull request #55 fix(e2e): allow Railway origin in CSP, loosen rate limits for E2E load
- **656a523** (2026-07-02): Merge pull request #53 fix(admin): protect /admin routes at the edge middleware layer
- **ec8dde2** (2026-07-02): Merge pull request #54 fix: pin fastapi<0.137.0 to avoid the _IncludedRouter regression
- **1e70fe7** (2026-07-02): Merge pull request #52 fix(e2e): correct E2E test mock data shapes (community-feed, gallery-albums)
- **7c59565** (2026-07-02): Merge pull request #49 fix(ci): correct E2E deployment targeting and manual dispatch backend
- **e88c001** (2026-07-02): Merge pull request #48 feat(ci): add nightly workflow for E2E stress tests
- **f836466** (2026-07-02): Merge pull request #47 ci: wire CODECOV_TOKEN/SENTRY_AUTH_TOKEN secrets
- **ee1e4d4** (2026-07-02): Merge pull request #46 fix(ci): E2E timeout sharding fix
- **9e6527e** (2026-07-01): Merge pull request #45 chore(frontend): add 1440px to image deviceSizes breakpoints
- **c33040f** (2026-07-01): chore(frontend): add 1440px to image deviceSizes breakpoints (Deploy Frontend smoke test)
- **7676fa2** (2026-07-01): Merge pull request #44 fix(ci): run Vercel CLI steps from repo root in Deploy Frontend
- **a8e7a7c** (2026-07-01): Merge pull request #43 fix(schemas,e2e): harden write schemas against invalid chars and fix flaky E2E tests
- **eeb97b0** (2026-07-01): fix(api): validate privacy_settings dict for NUL bytes and lone surrogates (#42)
- **22b4a35** (2026-07-01): fix(api): handle asyncpg InterfaceError and UnicodeError for invalid string input (#41)
- **feddc9d**: fix(ci): run railway up from repo root to fix Nixpacks source dir error
- **a954e1a**: fix(api): add le=10000 to all offset query params to prevent SQL overflow
- **4d6f0b1** (2026-02-04): feat(admin): Add comprehensive admin dashboard with performance optimizations (#5) -- 28 files, 4961 insertions

### Extracted Features (Standalone Subprojects)
- **Personals** (Specs 010, 012): Moved to `bgc-personals/` subdirectory
  - Separate databases for independent scaling
  - Shared authentication via same NextAuth secrets
  - Ports: 3001 (frontend), 8001 (backend)

### Active Branch
- **Branch**: `main`, local in sync with `origin/main`.
- **HEAD**: `cca5c04` (PR #122, on top of `36ecb13` for PR #121, `e64108c` for PR #120, `3aa7fe2`
  for PR #119, and `38dc6bc`/`547f452` for the two docs PRs before them) as of 2026-07-16.
- **Status**: A second same-day 2026-07-16 session merged four more PRs: **PR #119**/**PR #120**
  (frontend `src/lib` test coverage — `auth.ts`/`performance.ts`/`offline-storage.ts`/`prisma.ts`,
  now 100% lines/functions), **PR #121** (removed a redundant/broken CLI deploy job from `Deploy
  Frontend`; production was never actually affected — Vercel's native GitHub integration deploys
  independently), and **PR #122** (backend `verification.py`/`moderation.py` endpoint test coverage,
  closing the last item the PR #116 session had flagged open). All four branches deleted (local +
  origin). See items 31-35 above for full detail.

### Next Priorities
0. **Tracked as Issue #132.** `GET /api/moderation/stats`'s `resolved_today` field filters
   `ContentReport.created_at`, not an actual resolution timestamp (no `resolved_at`/`reviewed_at`
   column exists), so a report created yesterday and genuinely resolved today via `POST /resolve`
   is not counted. Needs either a schema change (add `resolved_at`) or a docs/UI fix acknowledging
   the narrower meaning. Demonstrated by
   `tests/test_moderation_api.py::TestGetModerationStats::test_resolved_today_counts_by_created_at_not_actual_resolution_time`.
1. ~~**deploy PR #115 to production**~~ — **confirmed deployed 2026-07-16**. `Deploy Backend`'s
   auto-deploy job (triggered by the PR #115/#116 merges touching `backend/**`) succeeded per
   GitHub Actions run history, and a direct read-only production query confirmed
   `alembic_version` = `k5l6m7n8o9p0` and `messages_default`/`messages_y2026m07`/
   `messages_y2026m08` all exist. `messages` can accept inserts again.
2. ~~**verify the `bgclive.online` domain in the Resend dashboard.**~~ — **confirmed verified,
   2026-07-26**. Checked via a read-only `GET /domains` call to Resend's API (no email sent):
   `bgclive.online` shows `"status": "verified"`, sending enabled. Verification/reset/warning
   emails can now actually reach users.
3. ~~**resume Issue #66 (DB partitioning)**~~ — **done, PR #89/#90 (2026-07-14)**, with a follow-up
   bug fixed and deployed 2026-07-16 (PR #115, see item 1 above). Still run
   `backend/scripts/backfill_messages_partitions.py` against production (described in PR #89 as
   manual/supervised, not automatic) to redistribute any rows that need it — moot for now since
   production has 0 rows in `messages`, but revisit once real traffic exists.
4. ~~**the last backend `app/api/` coverage gap**~~ — **DONE, PR #122 (2026-07-16)**.
   `verification.py`/`moderation.py` endpoint tests added (19 + 47 tests); all 18 backend
   `app/api/*.py` modules now have endpoint-level test coverage.
5. **New, non-blocking — `totp_secret` CI flakiness**: investigated (2026-07-13), root cause not
   found (passes locally in a reproduction of CI's exact environment); likely a GitHub Actions
   runner/pip-cache quirk, not an app bug.
6. **Tracked as Issue #136.** `search-advanced.spec.ts` dropdown bug: Ethnicity/Position option
   list stops appearing after the first filter selection — needs Playwright UI mode/trace viewer,
   not curl, to diagnose.
7. **WebKit-only flakiness**: `auth-2fa`/`auth-credentials` on mobile-safari improved but not fully
   resolved after the production DB migration fix; may be Playwright-WebKit-on-Linux-CI flakiness.
8. **Tracked as Issue #133.** NUL-byte/surrogate query-param audit: extend the `search.py` fix to
   `chat.py`, `admin.py`, `groups.py`, `moderation.py` query params — same `SafeBaseModel`-bypass
   class of bug. Not addressed by the 2026-07-13/14 coverage work (that work added tests for
   existing behavior; it did not audit query-param validation).
9. **Consider a dedicated non-production backend/database for E2E** — the production-DB-
   never-migrated incident from an earlier session is a strong argument; E2E currently shares fate
   with production data.
10. **E2E stress tests**: Still CI-skipped — consider moving to a nightly scheduled workflow.
11. Verify `CODECOV_TOKEN`/`SENTRY_AUTH_TOKEN` are actually wired (PR #47 addressed this — confirm).
12. **Tracked as Issue #134.** Untracked local tooling files: `.agents/`, `.claude/skills/`,
    `backend/.agents/`, `backend/.mcp.json`, `backend/Procfile` (untracked, recreated locally after
    PR #86 deleted it from git), `backend/skills-lock.json`, `skills-lock.json`, plus a
    modified-but-unstaged `.claude/settings.local.json` — none are application code, none committed
    as of 2026-07-16 (now carried forward across five sessions); should be gitignored or committed
    intentionally so `git status` stays clean.
13. ~~**docs fix, trivial**: `CLAUDE.md`'s documented backend lint command
    (`black . && flake8 .`) is stale~~ — **fixed, PR #124**. `CLAUDE.md` now correctly documents
    `ruff check .`.
14. **Tracked as Issue #135.** Infra recommendation, not code: exclude `frontend/node_modules/`,
    `backend/venv/`, and preventively `frontend/.next/` from Synology Drive sync on the Linux
    workstation — both have now been corrupted by sync flattening symlinks/dropping files mid-write.
15. **New, from 2026-07-16 — low urgency**: `tests/test_api_contract.py` bypasses the `db_session`
    per-test-rollback fixture (`TestClient` on `app.main.app` directly), so schemathesis's fuzzed
    mutating requests commit for real — currently harmless only because no CI workflow runs it
    combined with other test files in one `pytest` process. Also, `schemathesis`/
    `starlette_testclient` aren't pinned in `requirements.txt` despite `deploy-backend.yml` needing
    them.
16. ~~**Issue #68 (CSP hardening) / Issue #72 (distributed tracing) / Issue #66 Phase 7 (partitioning
    rollout verification)**~~ — **all closed as of 2026-07-26** (PRs #125/#126/#128 for CSP, #129
    for tracing, #130 for the partitioning rollout verification). As of this date: **zero open
    issues, zero open PRs**, only `main` exists as a branch.
    **Correction (later same day)**: this item's claim that only 12/14 remained was itself wrong —
    items 0, 6, and 8 above were also still open at the time, just never filed as GitHub issues
    (they'd only ever lived in this file's running notes). See item 17.
17. ~~**File the substantive backlog items above as real GitHub issues**~~ — **done, 2026-07-26**.
    Items 0, 6, 8, 12, 14 filed as Issues #132-#136 respectively (see each item above for the exact
    mapping). Items 5, 7, 9, 10, 11, 15 deliberately left as running notes rather than issues — they
    read as either non-blocking flakiness under investigation or open process questions ("should we
    do X") rather than a concrete, actionable fix. Also confirmed via a read-only Resend API call
    (`GET /domains`, no email sent) that item 2 (`bgclive.online` domain verification) is genuinely
    done — status `verified`, sending enabled.

## Dependencies

### Frontend Package Highlights
- `next`: 15.1.6
- `react`: 19.0.0
- `@tiptap/react`: 2.10.5
- `socket.io-client`: 4.8.1
- `zod`: 3.24.1
- `@supabase/supabase-js`: 2.49.2
- `recharts`: Added in PR #5 for admin analytics charts
- `@tanstack/react-virtual`: Added in PR #5 for chat virtual scrolling

### Backend Package Highlights
- `fastapi`: 0.115.6
- `sqlalchemy`: 2.0.36
- `alembic`: 1.14.0
- `pydantic`: 2.10.5
- `python-socketio`: 5.12.1
- `sentry-sdk`: 2.19.2
- `pyotp`: For TOTP 2FA generation
- `qrcode[pil]`: For QR code generation
- `resend`: Email service for verification emails
- `celery`: Async task queue for email delivery

## Environment Configuration

### Required Environment Variables

**Frontend** (`frontend/.env.local`):
- `NEXT_PUBLIC_API_URL`: Backend API base URL
- `AUTH_SECRET`: NextAuth JWT secret
- `AUTH_GOOGLE_ID/SECRET`: Google OAuth credentials
- `DATABASE_URL`: PostgreSQL connection (for Auth.js)

**Backend** (`backend/.env`):
- `DATABASE_URL`: PostgreSQL with asyncpg driver
- `REDIS_URL`: Redis connection string (for sessions and Celery)
- `SECRET_KEY`: FastAPI secret key
- `NEXTAUTH_SECRET`: Must match frontend `AUTH_SECRET`
- `SENTRY_DSN`: Sentry project DSN
- `SUPABASE_URL/KEY`: Supabase Storage credentials
- `RESEND_API_KEY`: Resend API key for email verification
- `CELERY_BROKER_URL`: Redis URL for Celery task queue
- `CELERY_RESULT_BACKEND`: Redis URL for Celery results

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Interfaces for data structures, types for unions
- PascalCase for components, camelCase for functions/variables

### Python
- Black formatter (line length 88)
- flake8 linting
- Type hints required for function signatures
- snake_case for all identifiers

### Git Workflow
- Feature branches from `007-production-readiness-secops`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- PR required for merge to main branch
- All tests must pass before merge

## Documentation Structure

### Code Documentation
- `CLAUDE.md`: Primary guidance for AI-assisted development
- `GEMINI.md`: Alternative AI assistant guidance (parallel work)
- `README.md`: Project overview and setup

### Specifications
- `/specs/NNN-feature-name/`: Feature specification directories
- `spec.md`: Requirements and user stories
- `plan.md`: Implementation strategy
- `tasks.md`: Task breakdown
- `data-model.md`: Schema definitions
- `contracts/`: API contracts (request/response examples)

### External Documentation
- **Obsidian Vault**: `BGC-Replica/` - Comprehensive project knowledge base
  - Architecture guides
  - API documentation
  - Testing strategies
  - Deployment procedures
  - Domain-specific next steps

## Key Architectural Decisions

### Why App Router over Pages Router?
- Server Components reduce client bundle size
- Simplified data fetching with async components
- Better TypeScript integration
- Nested layouts for UI consistency

### Why FastAPI over Node.js Backend?
- Strong type system with Pydantic
- Native async/await support
- Automatic OpenAPI documentation
- Excellent performance for I/O-bound operations

### Why PostgreSQL over MongoDB?
- Relational data model fits social networking use case
- Strong ACID guarantees for critical operations
- JSON/JSONB support for flexible schema sections
- Robust full-text search capabilities

### Why Supabase Storage over AWS S3?
- Integrated with PostgreSQL (same provider option)
- Built-in CDN and image transformations
- Simplified access control
- Generous free tier for development

## Known Technical Debt

1. **Performance**:
   - Profile load time optimization pending (T025)
   - Chat virtual-scroll performance under 1000+ messages untested at scale
   - GZip and Redis cache hit ratios not yet benchmarked in staging
2. **Accessibility**: Form focus management needs audit (T028)
3. **Security / Admin**:
   - Admin API endpoints lack dedicated rate limiting (user-facing endpoints are protected)
   - Admin action audit trail completeness review pending
4. **Testing**:
   - E2E test coverage for personals posting incomplete (now in bgc-personals subproject)
   - E2E tests for 2FA login flow needed
   - Email delivery testing in production environment — **partially resolved 2026-07-13**: Celery
     now actually runs in production and processes tasks correctly, but real Resend sends are still
     blocked pending `bgclive.online` domain verification in the Resend dashboard (not confirmed
     resolved as of 2026-07-15)
   - Admin dashboard load testing under concurrent access needed
   - Playwright E2E suite may contain flaky tests (excluded from merge requirements)
   - `totp_secret`-related CI flakiness (non-blocking, investigated 2026-07-13, root cause not
     found — reproduces CI's environment locally with no failure, likely a GitHub Actions
     runner/pip-cache quirk)
   - **Largely addressed 2026-07-13/14/15 (backfilled 2026-07-15, see items 20-25 above)**: backend
     `app/services/` + `chat.py`/`admin.py`/`socket_config.py` real test coverage added (PRs
     #91-#93, #96-#102); frontend `src/services/`, `src/store/`, `src/hooks/`, `src/components/`
     coverage added (PRs #103-#109); `src/app/` page-level coverage added (PRs #110-#113). A
     `coverage.py` async-tracer under-reporting bug was also fixed (`backend/.coveragerc`, `core =
     sysmon`) — real backend coverage is 71%, not the previously-assumed 63%.
   - **2026-07-16 (PR #116)**: confirmed and closed the remaining `backend/app/api/` gap — 5 of 18
     route modules had zero endpoint tests (`block.py`, `forums.py`, `groups.py`,
     `notifications.py`, `stories.py`); now fixed, 53 new tests, also fixing a real
     `GET /api/forums/tree` `MissingGreenlet` crash.
   - **2026-07-16 (PR #119/#120, same day)**: frontend `src/lib/auth.ts`/`performance.ts`/
     `offline-storage.ts`/`prisma.ts` all had 0% coverage; now 100% lines/functions across all of
     `src/lib`.
   - **2026-07-16 (PR #122, same day)**: `verification.py`/`moderation.py` were the last two of 18
     `backend/app/api/` modules with only service-layer, not endpoint, tests — **now closed** (19 +
     47 tests). All 18 route modules now have endpoint-level coverage. Found and documented (not
     fixed) a likely real bug: `GET /api/moderation/stats`'s `resolved_today` filters by
     `created_at`, not an actual resolution timestamp — see Next Priorities item 0.
5. **Schema Coverage**:
   - Any new write schemas must inherit `SafeBaseModel` from `backend/app/schemas/base.py`
   - Any new endpoints writing `Dict` fields to JSONB must add inline key/value validation
   - NUL-byte/surrogate query-param validation gap: `chat.py` (`category`), `admin.py`
     (`query`/`action`), `groups.py` (`query`), `moderation.py` (`status_filter`/`content_type`)
     likely have the same bug fixed in `search.py` this session — query params bypass
     `SafeBaseModel` unless explicitly validated. Needs a dedicated audit pass. **Not addressed by
     the 2026-07-13/14 coverage initiative or PR #116 (2026-07-16)** — that work added tests for
     existing behavior, not a validation audit; still open as of 2026-07-16.
   - E2E tests run against the same production Railway/Supabase backend real users hit — flagged
     twice now (this session's production-DB-never-migrated incident is the strongest argument yet
     for a dedicated non-production E2E environment)
6. **Documentation**:
   - API documentation needs OpenAPI spec export
   - User guide for 2FA setup needed
   - Admin dashboard user guide needed (user management, analytics, health)
   - Deployment runbook needs updating with new health endpoints
7. **Monitoring**:
   - ~~Distributed tracing (Spec 007 T008) was checked off but not actually connected to
     anything~~ — **fixed 2026-07-26, PR #129**: dead OpenTelemetry code/packages removed, real
     end-to-end tracing now wired through Sentry (already-configured auto-instrumentation on the
     backend, explicit `tracePropagationTargets` + CORS `allow_headers` fix for the frontend↔Railway
     cross-origin gap). Verified end-to-end, not assumed.
   - Production alerting and dashboards not configured (Sentry captures errors/traces; no
     dashboards/alert rules built on top of it yet)
   - Email delivery monitoring needed
   - 2FA adoption rate tracking needed
8. **Local Environment / Multi-Machine Dev** (surfaced 2026-07-12):
   - ~~Redis hosting migrated from Upstash to Railway at some point, but `env.md` (line 95) still
     recommends Upstash for production~~ — **fixed 2026-07-13, PR #84**
   - Development now happens from more than one machine (Windows + Linux); `backend/venv/` and
     `frontend/node_modules/` are gitignored/machine-specific, no repo conflict, but no Python
     version is pinned anywhere (no `.python-version`/`runtime.txt`/`python_requires`) — different
     machines may end up on different Python minor versions
   - Repo is synced via Synology Drive on at least one machine; sync can transiently show large
     numbers of false "deleted" files in `git status` and can strip POSIX execute bits from
     `node_modules/.bin/*`, breaking `next dev` with "Permission denied" until `chmod +x`'d
   - **Two confirmed sync-corruption instances as of 2026-07-16**: `frontend/node_modules/.bin/vitest`
     flattened from a symlink into a real file copy (broke `npx vitest`, fixed both times it
     recurred), and `backend/venv` created with `pip`'s own vendored `_vendor` directory missing
     entirely (worked around by building outside the synced tree, not persisted). Recommended, not
     yet actioned: exclude `frontend/node_modules/`, `backend/venv/`, and `frontend/.next/` from
     Synology Drive sync at the client level.
9. **Infrastructure / Deploy** (surfaced 2026-07-13):
   - **Resend domain verification pending**: `bgclive.online` is not verified in the Resend
     dashboard — real emails (verification, password reset, warnings) still fail to send even
     though Celery now correctly processes the tasks that queue them. Needs action in the Resend
     dashboard, not code.
   - ~~**`messages` table partition automation gap (found via #66 investigation, not yet fixed)**~~
     — **fixed 2026-07-14, PR #89/#90** (backfilled into this file 2026-07-15). Monthly partition
     automation now runs weekly via Celery Beat; `status_updates` is now partitioned too.
   - ~~**`messages` had zero partitions attached in production**~~ — **fixed and deployed
     2026-07-16, PR #115**. PR #89's own follow-on migration (`96be264b314b`, an unreviewed
     autogenerate side effect) had dropped `messages_default` and `messages_y2025m12` in every
     environment, including production, the day after partitioning was introduced — every
     `INSERT` into `messages` was failing. PR #115 (`k5l6m7n8o9p0_restore_messages_partitions.py`)
     fixed this; `Deploy Backend`'s auto-deploy ran on merge and a follow-up read-only production
     query confirmed `alembic_version` = `k5l6m7n8o9p0` with the partitions present. Still run
     `backend/scripts/backfill_messages_partitions.py` against production once real rows exist in
     `messages_default` to redistribute them (moot today — 0 rows). See `session-context.md`'s
     "Latest Session — PR #115" entry for full detail.
   - **`Deploy Frontend`'s CLI-based `deploy` job removed, 2026-07-16 (PR #121)**: was failing on
     every push to `main` since PR #119 (`Error: Invalid rewrite found`), but this was a false alarm
     for production — Vercel's native GitHub integration was independently deploying every push
     successfully throughout (confirmed via the Vercel API, live on `www.bgclive.online`). Removed
     the redundant job rather than fixing the underlying `NEXT_PUBLIC_API_URL` CLI-resolution gap
     (likely a Vercel "Sensitive" env var flag). Do not re-add a CLI deploy step to this workflow
     without first confirming whether the native GitHub integration is still handling deploys on its
     own.

## Subprojects

### BGC Personals (`bgc-personals/`)

**Purpose**: Standalone personals/classifieds platform with categorical listings and social features.

**Architecture**:
- **Independent deployment**: Separate frontend (port 3001) and backend (port 8001)
- **Separate database**: Own PostgreSQL instance for data isolation
- **Shared authentication**: Uses same NextAuth secrets for cross-app sessions
- **Complete feature set**: Categories, posts, comments, follows, real-time updates

**Key Components**:
- Frontend: 13 React components, custom hooks (use-comments, use-follow), personals service
- Backend: API routes, social models (PersonalPost, Comment, Follower), Socket.io events
- Assets: 46 image files (category banners, icons, buttons)
- Tests: Unit tests, integration tests, E2E tests

**Rationale for Extraction**:
1. **Scaling**: Personals can be scaled independently from core platform
2. **Deployment**: Can be deployed to different infrastructure
3. **Development**: Separate team can work without affecting main app
4. **Database**: Isolates high-volume personals data from core user data

**Integration Points**:
- Shared user authentication (JWT tokens)
- Cross-linking: Main app can link to personals posts
- Consistent UI/UX with shared design system

See `bgc-personals/README.md` for setup and deployment instructions.

## Resources

### Internal Links
- Project Repository: https://github.com/z3r0fidev/bgc-replica
- Active PR: https://github.com/z3r0fidev/bgc-replica/pull/2

### External Documentation
- Next.js Docs: https://nextjs.org/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- shadcn/ui: https://ui.shadcn.com
- Socket.io: https://socket.io/docs/v4
