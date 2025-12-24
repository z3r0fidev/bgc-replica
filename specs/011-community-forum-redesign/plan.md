# Implementation Plan: Community Forums Re-Design

**Branch**: `011-community-forum-redesign` | **Date**: 2025-12-23 | **Spec**: [specs/011-community-forum-redesign/spec.md](spec.md)
**Input**: Feature specification from `/specs/011-community-forum-redesign/spec.md`

## Summary
Overhaul the forum navigation and listings to provide a high-density categorical directory experience. The technical approach uses a self-referential adjacency list model for categories, TanStack Virtual for thread listings, and Redis Sets for real-time presence tracking. Visuals will adhere to the "Liquid Glass" branding with glassmorphism design tokens.

## Technical Context

**Language/Version**: TypeScript (Next.js 16), Python 3.14 (FastAPI)  
**Primary Dependencies**: `framer-motion`, `shadcn/ui`, `lucide-react`, `@tanstack/react-virtual`, `Socket.io`, `Redis`  
**Storage**: PostgreSQL (SQLAlchemy), Redis (Real-time stats)  
**Testing**: Vitest, Playwright (E2E), pytest (Backend)  
**Target Platform**: Web (PWA)
**Project Type**: Web application (Monorepo)
**Performance Goals**: <150ms navigation latency, 60 FPS scrolling
**Constraints**: Hierarchical data consistency, information-dense mobile UI
**Scale/Scope**: Support 1000+ threads per sub-forum, thousands of concurrent real-time counts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I (Library-First)**: Navigation tree and thread list row will be implemented as reusable UI components.
- [x] **Principle III (Test-First)**: Plan includes integration and unit test scenarios in `quickstart.md`.
- [x] **Principle V (Observability)**: Socket join/leave events and tree fetch latency will be instrumented.

## Project Structure

### Documentation (this feature)

```text
specs/011-community-forum-redesign/
├── plan.md              # This file
├── research.md          # Hierarchical models and real-time tracking research
├── data-model.md        # Hierarchical Category and Thread stats
├── quickstart.md        # Migration and verification scenarios
├── contracts/           # Forum Tree and Thread List API
└── tasks.md             # (To be created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   │   └── forums.py       # New tree and stats endpoints
│   └── models/
│       └── community.py    # Hierarchical model updates
└── tests/
    └── test_forums.py      # Backend hierarchy and stats tests

frontend/
├── public/assets/forums/
│   └── icons/              # New: status icons (sticky, hot, unread, locked)
├── src/
│   ├── app/
│   │   └── forums/         # New categorical routing structure
│   ├── components/
│   │   └── forums/         # High-density UI components
│   └── services/
│       └── forums.ts       # API client for tree and listings
└── tests/
    ├── e2e/                # Playwright navigation tests
    └── unit/               # Vitest component tests
```

**Structure Decision**: Web application (Monorepo). The feature requires coordinated updates across the data layer (FastAPI hierarchy) and presentation layer (Next.js tree nav and virtualized list).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Adjacency List + CTE | Hierarchical Navigation | Flat categories fail to support the "Directory" persona of the platform |
| Virtualization | High Information Density | Standard mapping degrades performance on mobile with 100+ threads |