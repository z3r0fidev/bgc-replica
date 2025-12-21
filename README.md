# BGCLive Replica

A modern social networking platform cloning the historical `bgclive.com`, adapted for modern web standards and mobile-first experiences.

## Project Structure

This project is organized as a monorepo:

- **`/frontend`**: Next.js 14+ application (UI, PWA, Client-side logic).
- **`/backend`**: FastAPI application (API, Authentication, Database management).
- **`/specs`**: Documentation for feature specifications, plans, and tasks.
- **`/assets`**: Project branding and static assets.

## Tech Stack

- **Frontend**: Next.js, Tailwind CSS, shadcn/ui, Framer Motion, Vitest, Playwright.
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Redis, pytest.
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

*Recent Updates*:
- Implemented comprehensive Backend E2E and API Contract testing using Schemathesis and Pytest.
- Initialized comprehensive database schema and applied table partitioning.
- Resolved Turbopack build errors and hardened frontend TypeScript configuration.
- Successfully seeded initial community data.

## Documentation
- [GEMINI.md](./GEMINI.md) - High-level project context.
- [REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md) - Technical implementation roadmap.
- [RESEARCH_SUMMARY.md](./RESEARCH_SUMMARY.md) - Historical site analysis.
- [AGENTS.md](./AGENTS.md) - Guidance for AI agents.