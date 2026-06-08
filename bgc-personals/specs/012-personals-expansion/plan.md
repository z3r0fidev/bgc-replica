# Implementation Plan: Personals Section Expansion

**Branch**: `012-personals-expansion` | **Date**: 2025-12-24 | **Spec**: [specs/012-personals-expansion/spec.md](spec.md)
**Input**: Feature specification from `/specs/012-personals-expansion/spec.md`

## Summary
Expand the personals directory with rich content creation and social interaction. Technical approach:
- Headless editor (Tiptap) for rich text and emoji.
- Relational join table for performant following.
- Socket.io scoped rooms for real-time threaded comments.
- Integration with Supabase Storage for multi-media attachments.

## Technical Context

**Language/Version**: TypeScript (Next.js 16), Python 3.14 (FastAPI)  
**Primary Dependencies**: `Tiptap`, `react-dropzone`, `Socket.io`, `Redis`, `Supabase Storage`  
**Storage**: PostgreSQL (SQLAlchemy), Redis (Real-time events)  
**Testing**: Playwright (E2E), Vitest (Unit), pytest (Backend)  
**Target Platform**: Web (PWA)
**Project Type**: Web application (Monorepo)
**Performance Goals**: <100ms follow toggle, 60fps comment scroll, sub-30s post flow
**Constraints**: 10MB image limit, 50MB video limit
**Scale/Scope**: Support 50+ comments per post, threaded to 2 levels.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I (Library-First)**: Media upload zone and Tiptap editor will be implemented as reusable component primitives.
- [x] **Principle III (Test-First)**: Quickstart.md defines optimistic UI and threading verification scenarios.
- [x] **Principle V (Observability)**: Sentry will track upload failures and Socket room join latencies.

## Project Structure

### Documentation (this feature)

```text
specs/012-personals-expansion/
├── plan.md              # This file
├── research.md          # Editor choice and follow persistence model
├── data-model.md        # PersonalPost, PostFollower, PostComment entities
├── quickstart.md        # Migration and optimistic UI scenarios
├── contracts/           # Posts and Comments API
└── tasks.md             # (To be created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   │   └── personals_expansion.py # New endpoints
│   └── models/
│       └── social.py              # Follower and Comment models
└── tests/
    └── test_personals_social.py   # Backend logic tests

frontend/
├── src/
│   ├── components/
│   │   └── personals/
│   │       ├── editor/            # Tiptap wrapper
│   │       ├── comments/          # Threaded comment components
│   │       └── media-upload.tsx   # Dropzone integration
│   └── services/
│       └── personals-social.ts    # API client
└── tests/
    ├── e2e/                       # Media upload and follow flows
    └── unit/                      # Optimistic state tests
```

**Structure Decision**: Monorepo update. New endpoints added to backend to support social state; frontend expanded with complex UI components for editing and threading.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Relational Follow Table | Query Performance | Metadata JSON fails when counting thousands of followers for a single post |
| Socket.io Scoping | Real-time Noise | Global broadcasting would waste bandwidth on unrelated posts |