# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BGCLive Replica is a modern social networking platform (Next.js 16 / FastAPI / PostgreSQL / Redis) organized as a monorepo with `/frontend` and `/backend` directories.

## Commands

### Development
```bash
# Backend (FastAPI)
cd backend && .\venv\Scripts\python -m uvicorn app.main:app --reload --port 8000  # Windows
cd backend && uvicorn app.main:app --reload  # Unix

# Frontend (Next.js)
cd frontend && npm run dev
```

### Build & Lint
```bash
cd frontend && npm run build        # Next.js production build
cd frontend && npm run lint         # ESLint
cd backend && ruff check .           # Python linting (matches backend-ci.yml; black/flake8 are not used)
```

### Testing
```bash
cd frontend && npm run test                    # Vitest unit tests
cd frontend && npm run test:e2e                # Playwright E2E
cd frontend && npm run test -- --run path/to   # Single test file
cd backend && pytest                           # All backend tests
cd backend && pytest -k test_name              # Single test by name
```

### Database
```bash
cd backend && alembic upgrade head             # Apply migrations
cd backend && python scripts/seed_profiles.py  # Seed data
```

## Architecture

### Frontend (`/frontend`)
- **App Router**: Route groups `(auth)`, `(protected)`, `(forums)`, `(personals)` in `/src/app`
- **Components**: `/src/components` organized by feature (chat, feed, forums, personals, profile, ui)
- **State**: Zustand stores in `/src/store`
- **API Client**: Service modules in `/src/services` (profileService, personals, forums)
- **Validation**: Zod schemas in `/src/lib/validations`
- **Types**: TypeScript definitions in `/src/types`

### Backend (`/backend`)
- **Entry**: `/app/main.py` - FastAPI app with middleware and route registration
- **Routes**: `/app/api/` - profiles.py, auth.py, search.py, chat.py, forums.py, personals.py
- **Models**: `/app/models/` - SQLAlchemy ORM (user.py contains User, Profile, Auth.js tables)
- **Schemas**: `/app/schemas/` - Pydantic request/response DTOs
- **Services**: `/app/services/` - Business logic (profile_service.py for privacy masking)
- **Core**: `/app/core/` - config.py (settings), database.py, redis_config.py, socket_config.py

### Key Patterns
- Frontend fetches via rewrites: `/api/:path*` → `http://127.0.0.1:8000/api/:path*`
- Auth: NextAuth v5 with JWT validation via shared `NEXTAUTH_SECRET`
- Real-time: Socket.io for chat, comments, presence
- Privacy: Field-level privacy settings (PUBLIC, FRIENDS_ONLY, PRIVATE) enforced by ProfileService

## Environment Variables

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=<openssl rand -base64 33>
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>
DATABASE_URL=postgresql://postgres:pass@host:5432/db
```

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://postgres:pass@host:5432/db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=<openssl rand -hex 32>
NEXTAUTH_SECRET=<matches AUTH_SECRET>
SENTRY_DSN=<from Sentry.io>
SUPABASE_URL=https://[id].supabase.co
SUPABASE_KEY=<service role key>
MEDIA_BUCKET_NAME=bgclive-media
```

## Code Style

- **TypeScript**: Strict mode, interfaces preferred, no `any`. PascalCase for components, camelCase for functions.
- **Python**: Black formatting, snake_case, Pydantic for validation.
- **Imports**: Absolute imports, group externals then internals alphabetically.
- **Error Handling**: Use `Sentry.captureException()` for errors, `Sentry.startSpan()` for tracing.

## Specifications

Feature specs live in `/specs/001-*/` through `/specs/013-*/`. Each contains:
- `spec.md` - Requirements
- `plan.md` - Implementation approach
- `tasks.md` - Task breakdown
- `data-model.md` - Schema definitions
- `contracts/` - API contracts
