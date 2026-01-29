# Implementation Plan: User Profile Expansion

**Branch**: `013-profile-expansion` | **Date**: 2025-12-24 | **Spec**: [specs/013-profile-expansion/spec.md](spec.md)
**Input**: Feature specification from `/specs/013-profile-expansion/spec.md`

## Summary

Expand the user profile system from basic physical attributes to a robust social identity hub. This involves a backend schema expansion (PostgreSQL/SQLAlchemy), updated Pydantic schemas, and a modernized multi-tab frontend interface (Next.js/shadcn/ui) with granular privacy controls and discovery integration.

## Technical Context

**Language/Version**: TypeScript 5.6+ (Frontend), Python 3.14 (Backend)
**Primary Dependencies**: Next.js 16, FastAPI, shadcn/ui (Tabs, Forms, Select), Tiptap (Rich Text), Prisma 7, SQLAlchemy
**Storage**: PostgreSQL (Supabase) with JSONB for flexible extensions, Redis for search indexing
**Testing**: Vitest/Playwright (Frontend), pytest/HTTPX (Backend)
**Target Platform**: Web (PWA), Mobile-first
**Project Type**: Web application (monorepo)
**Performance Goals**: < 500ms public profile load, < 200ms privacy toggle latency, 60 FPS scroll
**Constraints**: Avoid SSR hydration mismatches (immediatelyRender: false for Tiptap), Strict CSP/CORS alignment
**Scale/Scope**: Support 100+ robust personas, 40+ possible profile attributes, 4 functional modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Modular Library-First**: Does the expansion keep the profile logic self-contained? **PASS**
2. **Test-First Mandatory**: Are unit and integration tests planned for both API and UI? **PASS**
3. **Observability**: Is Sentry tracing planned for the new profile update endpoints? **PASS**
4. **Simplicity (YAGNI)**: Are we using JSONB where appropriate instead of creating 20+ migration columns? **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/013-profile-expansion/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/user.py   # Profile model extension
│   ├── schemas/profile.py # Extended Pydantic schemas
│   └── api/profiles.py  # New expansion endpoints
└── tests/
    └── test_profiles_expansion.py

frontend/
├── src/
│   ├── components/profile/
│   │   ├── edit/        # Tabbed form modules
│   │   └── view/        # Enhanced profile rendering
│   ├── services/profiles.ts
│   └── hooks/use-profile-privacy.ts
└── tests/
    ├── unit/profile-expansion.test.ts
    └── e2e/profile-privacy.spec.ts
```

**Structure Decision**: Web application structure (Option 2) utilized to maintain separation between FastAPI backend and Next.js frontend within the monorepo.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Multi-tab Form | UX requirement for robust profiles | Single long form causes user fatigue and poor completion rates. |
| Hybrid Schema (Columns + JSONB) | Performance vs Flexibility | Pure JSONB makes search filtering (FR-007) harder/slower; Pure columns requires massive migrations. |