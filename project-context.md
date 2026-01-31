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

### Completed Specifications
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

### Recent Commits
**2026-01-30** (Pending):
- Production deployment configurations
- Rate limiting expansion
- TypeScript type safety improvements
- Group chats feature
- Verification badges system
- PWA offline support
- CI/CD workflow enhancements

**2026-01-29**:
1. **bd32b05**: Notification preferences settings (731 lines, 8 files)
2. **33b40b5**: Admin moderation queue (999 lines, 5 files)
3. **42a0da9**: Two-factor authentication (1,353 lines, 12 files)
4. **85c9892**: Email verification with Resend (797 lines, 14 files)
5. **9979ce8**: Password reset flow

### Extracted Features (Standalone Subprojects)
- **Personals** (Specs 010, 012): Moved to `bgc-personals/` subdirectory
  - Separate databases for independent scaling
  - Shared authentication via same NextAuth secrets
  - Ports: 3001 (frontend), 8001 (backend)

### Active Branch
- **Branch**: `013-profile-expansion`
- **Status**: All recent security & moderation features committed and pushed
- **PR**: https://github.com/z3r0fidev/bgc-replica/pull/2

### Next Priorities
1. Deploy security features (2FA, email verification) to production
2. Configure Resend API key and Celery workers
3. E2E tests for 2FA and email verification flows
4. User documentation for security features
5. Admin training for moderation queue

## Dependencies

### Frontend Package Highlights
- `next`: 15.1.6
- `react`: 19.0.0
- `@tiptap/react`: 2.10.5
- `socket.io-client`: 4.8.1
- `zod`: 3.24.1
- `@supabase/supabase-js`: 2.49.2

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

1. **Performance**: Profile load time optimization pending (T025)
2. **Accessibility**: Form focus management needs audit (T028)
3. **Testing**:
   - E2E test coverage for personals posting incomplete
   - E2E tests for 2FA login flow needed
   - Email delivery testing in production environment
4. **Documentation**:
   - API documentation needs OpenAPI spec export
   - User guide for 2FA setup needed
   - Admin guide for moderation queue needed
5. **Monitoring**:
   - Production alerting and dashboards not configured
   - Email delivery monitoring needed
   - 2FA adoption rate tracking needed

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
