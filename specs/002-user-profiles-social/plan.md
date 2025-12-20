# Implementation Plan: User Profiles & Social Graph

**Branch**: `002-user-profiles-social` | **Date**: 2025-12-20 | **Spec**: [specs/002-user-profiles-social/spec.md](spec.md)
**Input**: Feature specification from `/specs/002-user-profiles-social/spec.md`

## Summary

Implement the user profile management system, media gallery with storage integration, social relationship graph (Friends/Favorites), and discovery tools. This involves extending the database schema, creating storage buckets, building high-performance search APIs with Redis caching, and developing an interactive mobile-first frontend.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend), Python 3.11+ (Backend)
**Primary Dependencies**: Next.js 14+, FastAPI, SQLAlchemy 2.x, Pydantic, Supabase Storage, Framer Motion, Zustand.
**Storage**: PostgreSQL (Supabase) + Supabase Storage (Media) + Redis (Caching).
**Testing**: Vitest (Unit), Playwright (E2E), pytest (Backend).
**Target Platform**: Mobile-First PWA.
**Project Type**: Monorepo.
**Performance Goals**: < 3s upload latency, < 500ms search latency.
**Constraints**: Mobile-first UI, secure media handling, legacy fidelity.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Mobile-First PWA**: PASSED. Media gallery designed for touch interactions (SC-004).
- **II. Historical Fidelity**: PASSED. Rating system and profile attributes from original BGCLive included.
- **III. Modern Tech Stack**: PASSED. Adheres to Next.js + FastAPI + SQLAlchemy architecture.
- **IV. Community Safety**: PASSED. Privacy settings and reporting mechanisms included in edge cases.
- **V. Progressive Disclosure**: PASSED. This is the second logical phase.

## Project Structure

### Documentation (this feature)

```text
specs/002-user-profiles-social/
├── plan.md              # This file
├── research.md          # Media storage and geolocation patterns
├── data-model.md        # Extended user profile and relationship models
├── quickstart.md        # Setup for storage buckets and sample data
├── contracts/           # Profile and social API definitions
└── tasks.md             # Actionable tasks
```

### Source Code

```text
frontend/
├── src/app/
│   ├── (protected)/profile/edit/  # Profile editing
│   ├── (protected)/users/         # Discovery and search
│   └── (protected)/users/[id]/    # Public profile view
backend/
├── app/api/
│   ├── profiles.py                # Profile management
│   ├── social.py                  # Friends/Favorites logic
│   └── search.py                  # Filtered discovery
└── app/services/
    ├── storage.py                 # Supabase Storage wrapper
    └── location.py                # Geolocation helpers
```

**Structure Decision**: Continue monorepo pattern established in Phase 1.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Geolocation Dependency | Essential for regional discovery | Manual zip-code-only entry is poor UX for mobile users |
| Supabase Storage | Robust media management | Local file storage not scalable or mobile-friendly |