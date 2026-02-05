# Session Context

**Last Updated**: 2026-02-04 (Session 2 Closing)
**Current Branch**: `main`
**Session Status**: Closed - Admin hardening (rate limits, unit tests, load/stress tests) committed

## Current State

### Latest Commit -- Admin Hardening: Rate Limits, Unit Tests, Load & Stress Tests
5 files changed in this session's commit (1 modified, 4 new). All items close out the
"Outstanding Tasks / Follow-Up Items" list that was carried forward from the PR #5 closure session.

#### Rate Limiting on admin.py (modified)
Every one of the 14 admin API endpoints in `backend/app/api/admin.py` now carries a
`RateLimiter` dependency. Three tiers were applied based on operation sensitivity:

| Tier | Limit | Endpoints |
|------|-------|-----------|
| Read | 30 req / 60 s | GET /stats, GET /users, GET /users/{id}, GET /action-logs, GET /analytics/overview, GET /analytics/users, GET /analytics/engagement, GET /health, GET /health/database, GET /health/redis |
| Update | 10 req / 60 s | PATCH /users/{id} |
| Sensitive | 5 req / 60 s | POST /users/{id}/suspend, POST /users/{id}/ban, POST /users/{id}/restore, POST /users/{id}/make-admin, POST /users/{id}/revoke-admin |

All rate limits use the existing `fastapi_limiter` + Redis backend that is already in place
for user-facing endpoints. No new dependencies were introduced.

#### Unit Tests -- BlockService (new, 404 lines)
`backend/tests/test_block_service.py` -- 22 test cases across 7 classes:
- TestBlockUser: success, already-blocked idempotency, self-block guard
- TestUnblockUser: success, not-blocked no-op
- TestGetBlockedUsers: populated list, empty list
- TestIsBlocked: true/false paths
- TestGetBlockStatus: four combinations (blocked-by-me, blocked-by-them, mutual, none)
- TestGetBlockIds: cache-hit short-circuit, cache-miss DB fallback with write-through
- TestCacheOperations: Redis hit, miss, error resilience for get/set/invalidate

#### Unit Tests -- HealthService (new, 457 lines)
`backend/tests/test_health_service.py` -- 17 test cases across 5 classes:
- TestGetDatabaseStats: success, no-rows fallback, exception handling (status: down)
- TestGetRedisStats: success, minimal-info defaults, connection error
- TestGetErrorSummary: success, custom time window, no-rows, DB error
- TestGetComprehensiveHealth: all-healthy, DB-down (unhealthy), Redis-down (unhealthy),
  degraded (errors but services up), both-down, timestamp validity
- TestHealthServiceIntegration: singleton existence, default hours parameter

#### Load Test -- Admin Dashboard (new, 312 lines)
`backend/tests/load_test_admin.py` -- Locust-based load harness with three user classes:
- AdminUser (weight default): read-heavy workload hitting all 14 endpoints; task weights
  mirror expected dashboard usage (stats 5x, user-list 4x, search 3x, filters 3x, health 3x, etc.)
- AdminWriteUser (weight 1): write operations (PATCH /users/{id}) at lower frequency
  (5-10 s wait); 404 on random UUIDs is expected and marked as success.
- DashboardRefreshSimulator: 30-second refresh cycle hitting /stats + /health back-to-back,
  matching the auto-refresh behaviour of the frontend health page.
- Custom event hook prints p50/p95/p99 latency and failure rate on test stop.

#### Stress Test -- Chat Virtual Scroll (new, 330 lines)
`frontend/tests/e2e/chat-virtual-scroll-stress.spec.ts` -- Playwright stress suite with
four describe blocks:
- Large Message Count Performance: injects 1 000 synthetic messages, asserts render time
  under 2 s and rendered DOM count under 50 (overscan window only).
- Rapid Scrolling Stress: 50-iteration scroll loop with per-frame timing; asserts average
  FPS >= 30. Includes a scroll-to-top sub-test (target < 500 ms).
- Memory Usage: 10 full top-to-bottom scroll cycles; asserts heap growth < 100 MB.
  Unmount sub-test verifies cleanup with GC if available.
- Paint Performance: CDP-based paint-rect and layout metric capture during scroll; ensures
  virtual scroll limits repaint surface to the visible viewport.

### Previously Shipped -- Admin Dashboard & Performance Optimization (PR #5, Commit 4d6f0b1)
See previous session entry in conversation-context.md for the full 28-file breakdown.
Key points: GZipMiddleware, Sentry 10% sampling, Redis block/friendship caches,
full admin user-management API, analytics (Recharts), health monitoring, batch comments,
chat virtual scrolling (@tanstack/react-virtual), Progress/Separator/Table UI primitives,
admin E2E tests.

### Repository Health
- **Branch**: `main`, up to date with `origin/main`
- **Working tree**: Clean after this session's commit
- **No divergence** between local and remote

## Current Objectives

### Completed (cumulative)
- [x] PR #5 merged to main (admin dashboard + perf optimizations)
- [x] Rate limiting added to all 14 admin API endpoints (3-tier strategy)
- [x] Unit tests for block_service.py (22 cases, cache paths covered)
- [x] Unit tests for health_service.py (17 cases, degraded/unhealthy states covered)
- [x] Locust load test for admin dashboard (3 user classes, custom reporting)
- [x] Playwright stress test for chat virtual scroll (1 000+ messages, FPS, memory, paint)

### Next Session Priorities
1. **Remaining Validation (from original follow-up list)**
   - Benchmark GZip compression savings on representative payloads
   - Verify Redis cache hit ratios in a staging environment
   - Run the load test against a staging instance and record baseline p95/p99

2. **Documentation**
   - Admin dashboard user guide (user management, analytics, health)
   - Rate limiting documentation for API consumers (include admin tiers)
   - Deployment runbook update with new health endpoints

3. **Carried-forward items**
   - E2E tests for 2FA login flow
   - Production email delivery verification (Resend + Celery)
   - Admin dashboard user guide

## Environment Status

### Development Services
- Backend: FastAPI on http://localhost:8000
- Frontend: Next.js on http://localhost:3000
- Database: PostgreSQL (async via asyncpg)
- Redis: Sessions, rate limiting, Celery broker, block/friendship caches
- Socket.io: Real-time chat, comments, presence
- Celery: Async email delivery worker

### Branch & Git State
- Active branch: `main`
- All changes pushed, working tree clean
- Remote: https://github.com/z3r0fidev/bgc-replica

## Key Decisions

### Admin Rate Limiting (this session)
1. **Three-tier model**: Read / Update / Sensitive mirrors the existing pattern used on
   user-facing endpoints. Sensitive actions (suspend, ban, restore, privilege changes) are
   capped at 5 req/60 s -- tight enough to block scripted abuse, loose enough that a human
   admin doing legitimate bulk work will not hit the ceiling.
2. **No new infrastructure**: Reuses fastapi_limiter + Redis already in production.
3. **Locust over custom harness**: Locust provides built-in p95/p99 reporting and a
   browser UI; no value in reimplementing that.

### Test Design (this session)
1. **AsyncMock + patch for services**: block_service and health_service both have Redis
   calls that should not touch a real broker in unit tests. All Redis paths are patched;
   error-resilience paths are explicitly tested (cache errors return None / are silently
   swallowed, never crash the request).
2. **Synthetic message injection for scroll stress**: The chat window is wired to a
   Zustand store; injecting 1 000 messages via a CustomEvent + window reference avoids
   standing up a full WebSocket + backend stack just to stress-test the renderer.
3. **CDP paint-rect overlay**: The paint-performance block uses Chrome DevTools Protocol
   directly to verify that virtual scrolling limits repaint area. This is not assertable
   via standard Playwright APIs.

### Performance Architecture (PR #5, still active)
1. GZip at middleware level
2. Sentry 10% sampling
3. Redis TTL strategy: blocks 5 min, friendships 10 min
4. @tanstack/react-virtual for chat
5. Batch comments endpoint (IN clause)

### Previous Session Decisions (still active)
- 2FA: TOTP-based with pyotp, backup codes bcrypt-hashed
- Email verification: SHA-256 tokens, Resend, Celery async delivery
- Privacy: Field-level JSONB, three tiers, enforced server-side by ProfileService
- Rate limiting: Redis-backed, tiered per endpoint

## Notes for Next Session

### Important Context
- Admin rate limits are now live. If load-testing against a local dev server, the limits
  will fire. Use `--headless -u 50 -r 10 -t 60s` to stay within the read-tier ceiling
  per user while still exercising concurrency.
- `test_block_service.py` and `test_health_service.py` are pure-mock unit tests. They do
  not require a running Postgres or Redis instance.
- `load_test_admin.py` requires `locust` installed (`pip install locust`) and a running
  backend (`uvicorn app.main:app`).
- `chat-virtual-scroll-stress.spec.ts` requires the Next.js dev server on port 3000.
- chat-window.tsx was significantly refactored for virtual scrolling -- review carefully
  before touching.
- admin_action_logs migration must have run before admin endpoints will function.

### Configuration Reminders
- `RESEND_API_KEY` needed in backend .env for email verification
- Celery worker must be running for async email tasks
- Redis must be available for block/friendship caches and rate limiting
- Sentry DSN required; sampling now at 0.1
