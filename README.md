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
- **Phase 9 (DevOps & CI/CD)**: COMPLETED ✅
- **Phase 10 (Deployment Automation)**: COMPLETED ✅
- **Phase 11 (Robust Data Seeding)**: COMPLETED ✅
- **Phase 12 (Personals Section)**: COMPLETED ✅

*Recent Updates*:
- Built a high-performance **Personals Section** with categorical navigation, themed headers, and **DOM Virtualization** (60 FPS scrolling).
- Expanded test data with **150+ robust personas** featuring realistic identities, usernames, and bios across the PHL/NJ metro areas.
- Implemented **GitHub Actions** CI/CD pipelines for full monorepo automation (Lint/Test/Build).
- Set up **Automated Deployment** to Railway via the official CLI integrated into the CI/CD workflow.
- Implemented **Advanced Search Sidebar** with 10+ granular filters and **Geolocation** ("Use My Location").

## Documentation
- [GEMINI.md](./GEMINI.md) - High-level project context.
- [REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md) - Technical implementation roadmap.
- [RESEARCH_SUMMARY.md](./RESEARCH_SUMMARY.md) - Historical site analysis.
- [AGENTS.md](./AGENTS.md) - Guidance for AI agents.