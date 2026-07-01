# Session Context

**Last Updated**: 2026-07-01 (Session Closing)
**Current Branch**: `main`
**Session Status**: Closed — asyncpg encoding hardening complete, CI/CD fully green, Railway confirmed

## Current State

### Latest Merged Work — SafeBaseModel NUL/Surrogate Hardening (PR #41 + PR #42)

PR #41 (`22b4a35`) and PR #42 (`eeb97b0`) landed the full fix for asyncpg encoding failures
exposed by Schemathesis contract tests. Both squash-merged cleanly to main.

### What Was Shipped

#### Root Cause Discovery
asyncpg has **3 separate encoding paths** depending on column type, each raising a different
exception when given NUL bytes (`\x00`) or lone Unicode surrogates (`\ud800`–`\udfff`):
1. Plain `String` columns → `asyncpg.exceptions._base.InterfaceError`
2. `ARRAY(String)` columns → different asyncpg encoding path, bypasses global handler
3. `JSONB` `Dict[str, str]` → JSON serializer raises yet another exception type

The single reliable interception point is the **Pydantic validation layer** (before any asyncpg call).

#### PR #41 — Global Handlers (commit `22b4a35`)
- `backend/app/main.py`: added `SQLAInterfaceError` + `UnicodeError` global exception handlers
- `backend/app/schemas/profile.py`: `ProfileBase.validate_string_lists` for `List[str]` fields

#### PR #42 — SafeBaseModel Pattern (commit `eeb97b0`)
- **NEW**: `backend/app/schemas/base.py`
  - `_assert_safe_string(s: str) -> str` — rejects NUL bytes and lone surrogates; returns `s`
  - `SafeBaseModel(BaseModel)` — `model_validator(mode='before')` runs on all str/list[str] fields
- `backend/app/schemas/profile.py` — `ProfileBase` inherits `SafeBaseModel`
- `backend/app/schemas/community.py` — all 7 write schemas switched to `SafeBaseModel`
- `backend/app/schemas/chat.py` — `MessageBase`, `ChatRoomBase` switched
- `backend/app/schemas/group_chat.py` — all 5 write schemas switched
- `backend/app/schemas/story.py` — `StoryBase`, `StoryUpdate` switched; F401 ruff fix
- `backend/app/api/profiles.py` — inline JSONB validation loop in `update_privacy_settings`
- **Bug fixed**: `_assert_safe_string` was returning `None` (missing `return s`) — caused 422 on valid inputs

### Repository Health
- **Branch**: `main`, local synced to `eeb97b0`
- **CI Status**: All passing — Backend CI, PR Validation, Deploy Backend (quality-check + deploy)
- **Railway**: End-to-end deployment confirmed working for first time
- **Working tree**: Clean (untracked: `.agents/`, `.claude/skills/`, `skills-lock.json`)
- **Workflow cleanup**: 24 failed/cancelled runs deleted from GitHub Actions

## Current Objectives

### Completed (as of 2026-07-01)
- [x] PR #41 merged — global SQLAInterfaceError + UnicodeError exception handlers
- [x] PR #42 merged — SafeBaseModel pattern across all write schemas
- [x] asyncpg 3-encoding-path root cause fully diagnosed and fixed
- [x] Deploy Backend workflow passing Railway end-to-end
- [x] 24 stale workflow runs cleaned up from GitHub Actions

### Next Session Priorities
1. **E2E Tests**: Playwright E2E tests excluded from PR merge requirements but still run.
   Review whether any are genuinely failing vs slow/flaky.
2. **Remaining SafeBaseModel coverage**: Run `grep -r "class.*BaseModel" backend/app/schemas/`
   to find any write schemas still using plain `BaseModel`.
3. **JSONB audit**: Identify other endpoints writing `Dict` fields (besides `privacy_settings`)
   and add inline validation matching the pattern in `profiles.py`.
4. **Frontend CI**: `frontend-ci.yml` was in the initial modified file list — confirm it is green.
5. **Railway monitoring**: Check Railway logs periodically for new 500s from contract tests
   or production traffic.

## Environment Status

### Development Services
- Backend: FastAPI on http://localhost:8000
- Frontend: Next.js on http://localhost:3000
- Database: PostgreSQL (async via asyncpg)
- Redis: Sessions, rate limiting, Celery broker, caches
- Socket.io: Real-time chat, comments, presence
- Celery: Async email delivery worker

### Branch & Git State
- Active branch: `main`
- HEAD: `eeb97b0` — fix(api): validate privacy_settings dict for NUL bytes and lone surrogates (#42)
- All changes pushed, working tree clean
- Remote: https://github.com/z3r0fidev/bgc-replica

## Key Decisions

### SafeBaseModel Architecture (PR #42)
1. **Pydantic layer as single guard**: Chosen over asyncpg-level patch because it catches all
   three encoding-path variants (String, ARRAY(String), JSONB) uniformly.
2. **`model_validator(mode='before')`**: Runs before any field coercion, ensuring raw input is
   sanitized before Pydantic parses types.
3. **`SafeBaseModel` base class**: Applied to all write schemas; read-only response schemas do not
   need it (data already in DB is safe).
4. **Inline JSONB validation for dict fields**: `SafeBaseModel` handles `str` and `list[str]`
   fields automatically; dict values require explicit iteration in the endpoint.
5. **Return-value bug fixed early**: `_assert_safe_string` missing `return s` was caught before
   any merge — would have caused 422 on all valid requests.

### Previous Session Decisions (still active)
- 2FA: TOTP-based with pyotp, backup codes bcrypt-hashed
- Email verification: SHA-256 tokens, Resend, Celery async delivery
- Privacy: Field-level JSONB, three tiers, enforced server-side by ProfileService
- Rate limiting: Redis-backed, tiered per endpoint
- Admin dashboard: GZip, Sentry 10% sampling, Redis caching, batch comments, virtual scroll

## Notes for Next Session

### Important Context
- `backend/app/schemas/base.py` is new — the `SafeBaseModel` import must be used wherever
  `BaseModel` was used in write schemas.
- Railway end-to-end is confirmed working; do not change `backend/railway.json` or the deploy
  workflow without understanding the Nixpacks / `railway up --service=$RAILWAY_SERVICE_ID` pattern.
- Schemathesis contract tests run in the Backend CI `quality-check` job — if they start failing
  again, check for new write endpoints that were not given `SafeBaseModel`.
- 24 failed/cancelled GitHub Actions runs were deleted this session; history is clean.
