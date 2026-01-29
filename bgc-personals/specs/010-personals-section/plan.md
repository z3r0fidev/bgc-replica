# Implementation Plan: Personals Section (TransX Style)

**Branch**: `010-personals-section` | **Date**: 2025-12-23 | **Spec**: [specs/010-personals-section/spec.md](spec.md)
**Input**: Feature specification from `/specs/010-personals-section/spec.md`

## Summary
Implement a categorical personals directory inspired by TransX/ListCrawler. The technical approach leverages Next.js App Router for themed sub-routes, `@tanstack/react-virtual` for high-performance listing rendering, and a custom sidebar component for categorical navigation using extracted legacy-style iconography.

## Technical Context

**Language/Version**: TypeScript (Next.js 14+), Python 3.12 (FastAPI)  
**Primary Dependencies**: `framer-motion`, `@tanstack/react-virtual`, `shadcn/ui`, `lucide-react`  
**Storage**: PostgreSQL (Prisma), Redis (Metadata caching)  
**Testing**: Vitest, Playwright (E2E), Pytest (Backend)  
**Target Platform**: PWA (Mobile-first)
**Project Type**: Web application (Monorepo)
**Performance Goals**: 60 FPS scrolling, <200ms category switching, <1.5s FCP
**Constraints**: High-density UI preservation, mobile drawer implementation
**Scale/Scope**: Support 1000+ listings with geographic and categorical filtering

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle III (Test-First)**: Plan includes manual and automated verification scenarios in `quickstart.md`.
- [x] **Principle V (Observability)**: Sentry instrumentation will be added to listing fetch operations.
- [x] **Simplicity**: Official TanStack Virtual hook chosen for efficient list management without custom scroll logic.

## Project Structure

### Documentation (this feature)

```text
specs/010-personals-section/
├── plan.md              # This file
├── research.md          # List virtualization and sidebar strategy
├── data-model.md        # Category metadata and listing extensions
├── quickstart.md        # Category switch and mobile verification
├── contracts/           # Listings and Category API endpoints
└── tasks.md             # (To be created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   │   └── personals.py    # New: Personals endpoints
│   └── models/             # Reusing User/Profile with metadata
└── tests/                  # Pytest for listings logic

frontend/
├── public/assets/personals/ # PNG icons and banners
├── src/
│   ├── app/
│   │   └── (personals)/
│   │       └── personals/
│   │           └── [category]/page.tsx # Categorical routing
│   ├── components/
│   │   └── personals/
│   │       ├── sidebar.tsx  # Featured Lists Sidebar
│   │       ├── list.tsx     # Virtualized listing view
│   │       └── row.tsx      # High-density row component
│   └── services/
│       └── personals.ts     # API client for listings
└── tests/                   # Playwright E2E for scroll/nav
```

**Structure Decision**: Web application (Monorepo). The feature spans both backend (filtering/seeding) and frontend (specialized layouts and virtualization).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Virtualization | High listing density | Direct mapping would crash mobile browsers with 500+ items |
| Routing Overlap | `[category]` sub-routes | Single page filtering would break browser "Back" behavior and SEO |