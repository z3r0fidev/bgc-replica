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
16. **E2E CSP/Rate-Limit/CORS Hardening + Production DB Migration** (2026-07-03, PR #55, merge
    commit b1a9e2e):
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
- **Branch**: `main`
- **HEAD**: `b1a9e2e`
- **Status**: Up to date with origin/main; only session-doc/tooling files pending commit

### Next Priorities
1. **`search-advanced.spec.ts` dropdown bug**: Ethnicity/Position option list stops appearing after
   the first filter selection — needs Playwright UI mode/trace viewer, not curl, to diagnose.
2. **WebKit-only flakiness**: `auth-2fa`/`auth-credentials` on mobile-safari improved but not fully
   resolved after the production DB migration fix; may be Playwright-WebKit-on-Linux-CI flakiness.
3. **NUL-byte/surrogate query-param audit**: extend the `search.py` fix to `chat.py`, `admin.py`,
   `groups.py`, `moderation.py` query params — same `SafeBaseModel`-bypass class of bug.
4. **Consider a dedicated non-production backend/database for E2E** — this session's production-DB-
   never-migrated incident is a strong argument; E2E currently shares fate with production data.
5. **E2E stress tests**: Still CI-skipped — consider moving to a nightly scheduled workflow.
6. Verify `CODECOV_TOKEN`/`SENTRY_AUTH_TOKEN` are actually wired (PR #47 addressed this — confirm).
7. **New (2026-07-12) — fix stale Upstash reference in `env.md`**: line 95 still recommends
   Upstash for production Redis; the project has migrated to Railway. Small, low-risk doc fix.

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
   - Email delivery testing in production environment
   - Admin dashboard load testing under concurrent access needed
   - Playwright E2E suite may contain flaky tests (excluded from merge requirements)
5. **Schema Coverage**:
   - Any new write schemas must inherit `SafeBaseModel` from `backend/app/schemas/base.py`
   - Any new endpoints writing `Dict` fields to JSONB must add inline key/value validation
   - NUL-byte/surrogate query-param validation gap: `chat.py` (`category`), `admin.py`
     (`query`/`action`), `groups.py` (`query`), `moderation.py` (`status_filter`/`content_type`)
     likely have the same bug fixed in `search.py` this session — query params bypass
     `SafeBaseModel` unless explicitly validated. Needs a dedicated audit pass.
   - E2E tests run against the same production Railway/Supabase backend real users hit — flagged
     twice now (this session's production-DB-never-migrated incident is the strongest argument yet
     for a dedicated non-production E2E environment)
6. **Documentation**:
   - API documentation needs OpenAPI spec export
   - User guide for 2FA setup needed
   - Admin dashboard user guide needed (user management, analytics, health)
   - Deployment runbook needs updating with new health endpoints
7. **Monitoring**:
   - Production alerting and dashboards not configured
   - Email delivery monitoring needed
   - 2FA adoption rate tracking needed
8. **Local Environment / Multi-Machine Dev** (surfaced 2026-07-12):
   - Redis hosting migrated from Upstash to Railway at some point, but `env.md` (line 95) still
     recommends Upstash for production — stale, needs a doc fix
   - Development now happens from more than one machine (Windows + Linux); `backend/venv/` and
     `frontend/node_modules/` are gitignored/machine-specific, no repo conflict, but no Python
     version is pinned anywhere (no `.python-version`/`runtime.txt`/`python_requires`) — different
     machines may end up on different Python minor versions
   - Repo is synced via Synology Drive on at least one machine; sync can transiently show large
     numbers of false "deleted" files in `git status` and can strip POSIX execute bits from
     `node_modules/.bin/*`, breaking `next dev` with "Permission denied" until `chmod +x`'d

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
