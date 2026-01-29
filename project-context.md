# Project Context: BGC Replica

**Project**: BGCLive Replica - Modern Social Networking Platform
**Stack**: Next.js 16 (App Router) + FastAPI + PostgreSQL + Redis
**Repository**: https://github.com/z3r0fidev/bgc-replica
**Documentation**: See `CLAUDE.md` for commands and architecture

## Project Overview

BGCLive Replica is a full-stack social networking platform inspired by community-driven social sites. It combines real-time communication, personals/dating features, forums, and rich user profiles with granular privacy controls.

### Core Features
1. **Authentication**: NextAuth v5 with Google OAuth and JWT-based session management
2. **User Profiles**: Comprehensive identity, lifestyle, professional, and social data with field-level privacy
3. **Personals**: Categorical directory with rich-text posts, media uploads, and social engagement
4. **Forums**: Threaded discussions with categories and real-time commenting
5. **Chat**: Real-time messaging via Socket.io
6. **Search & Discovery**: Advanced filtering by profile attributes, interests, and intent

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
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (auth)/      # Auth flow pages
│   │   │   ├── (protected)/ # Authenticated pages
│   │   │   ├── (forums)/    # Forum pages
│   │   │   └── (personals)/ # Personals pages
│   │   ├── components/      # React components
│   │   │   ├── chat/        # Chat UI
│   │   │   ├── feed/        # News feed
│   │   │   ├── forums/      # Forum components
│   │   │   ├── personals/   # Personals UI
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
├── backend/                 # FastAPI application
│   ├── alembic/            # Database migrations
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   ├── core/           # Config, DB, Redis
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── scripts/            # Utility scripts (seeding, etc.)
│   └── tests/              # Pytest tests
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
1. **Spec 001-012**: Core platform features (auth, profiles, personals, forums, chat)
2. **Spec 013**: Profile Expansion (identity, lifestyle, professional, privacy controls)

### Active Branch
- **Branch**: `013-profile-expansion`
- **Status**: Implementation complete, PR created
- **PR**: https://github.com/z3r0fidev/bgc-replica/pull/2

### Next Priorities
1. Merge Spec 013 to main branch
2. Performance audits and accessibility review
3. Plan next feature (Spec 014 or technical debt)

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

## Environment Configuration

### Required Environment Variables

**Frontend** (`frontend/.env.local`):
- `NEXT_PUBLIC_API_URL`: Backend API base URL
- `AUTH_SECRET`: NextAuth JWT secret
- `AUTH_GOOGLE_ID/SECRET`: Google OAuth credentials
- `DATABASE_URL`: PostgreSQL connection (for Auth.js)

**Backend** (`backend/.env`):
- `DATABASE_URL`: PostgreSQL with asyncpg driver
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: FastAPI secret key
- `NEXTAUTH_SECRET`: Must match frontend `AUTH_SECRET`
- `SENTRY_DSN`: Sentry project DSN
- `SUPABASE_URL/KEY`: Supabase Storage credentials

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
3. **Testing**: E2E test coverage for personals posting incomplete
4. **Documentation**: API documentation needs OpenAPI spec export
5. **Monitoring**: Production alerting and dashboards not configured

## Resources

### Internal Links
- Project Repository: https://github.com/z3r0fidev/bgc-replica
- Active PR: https://github.com/z3r0fidev/bgc-replica/pull/2

### External Documentation
- Next.js Docs: https://nextjs.org/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- shadcn/ui: https://ui.shadcn.com
- Socket.io: https://socket.io/docs/v4
