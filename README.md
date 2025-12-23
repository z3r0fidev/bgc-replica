# BGCLive Replica

A modern social networking platform cloning the historical `bgclive.com`, adapted for modern web standards and mobile-first experiences.

## Project Structure

This project is organized as a monorepo:

- **`/frontend`**: Next.js 16+ application (UI, PWA, Client-side logic).
- **`/backend`**: FastAPI application (API, Authentication, Database management).
- **`/specs`**: Documentation for feature specifications, plans, and tasks.
- **`/assets`**: Project branding and static assets.

## Tech Stack

- **Frontend**: Next.js 16, Tailwind CSS 4, shadcn/ui, Framer Motion, Vitest, Playwright, Prisma 7 (@prisma/adapter-pg).
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Redis, pytest, Celery.
- **Infrastructure**: Supabase (DB), Upstash (Redis - recommended).

## Getting Started

### Backend Setup
1. Navigate to `/backend`.
2. Create and activate a virtual environment: `python -m venv venv`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Configure `.env` file.
5. Start server: `.\venv\Scripts\python -m uvicorn app.main:app --reload --port 8000` (Windows) or `source venv/bin/activate && uvicorn app.main:app --reload` (Unix).

### Frontend Setup
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Configure `.env.local` file.
4. Start development server: `npm run dev`.

## Current Status
- **Phase 1 (Auth & Foundation)**: COMPLETED ✅
- **Phase 2 (User Profiles & Social)**: COMPLETED ✅
- **Phase 3 (Real-Time Chat)**: COMPLETED ✅
- **Phase 4 (Community & Forums)**: COMPLETED ✅
- **Phase 5 (PWA & Performance)**: COMPLETED ✅
- **Phase 6 (Final Polish & Enhancements)**: COMPLETED ✅
- **Phase 7 (Production Readiness & SecOps)**: COMPLETED ✅
- **Phase 8 (Extrapolated Features & Discovery)**: COMPLETED ✅

*Recent Updates*:
- Implemented **Advanced Search Sidebar** with 10+ granular filters and **Geolocation** ("Use My Location").
- Launched **BGC Originals** media portal and **User Stories** narrative section.
- Migrated to **Next.js 16 (Turbopack)** and **Prisma 7**, implementing `@prisma/adapter-pg` for improved database connectivity.
- Seeded database with **50 diverse test profiles** across the NY/NJ/PA tri-state area.

## Documentation
- [GEMINI.md](./GEMINI.md) - High-level project context.
- [REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md) - Technical implementation roadmap.
- [RESEARCH_SUMMARY.md](./RESEARCH_SUMMARY.md) - Historical site analysis.
- [AGENTS.md](./AGENTS.md) - Guidance for AI agents.