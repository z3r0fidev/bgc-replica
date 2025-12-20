# Implementation Plan: Community Features

**Branch**: `004-community-features` | **Date**: 2025-12-20 | **Spec**: [specs/004-community-features/spec.md](spec.md)
**Input**: Feature specification from `/specs/004-community-features/spec.md`

## Summary

Implement the core community engagement layer including threaded forum boards, a dual-tabbed social feed (Global/Following) with status updates, and user-led groups. This phase also introduces community safety through content flagging and a dedicated moderation queue for administrators.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend), Python 3.11+ (Backend)
**Primary Dependencies**: Next.js 14+ (App Router), Tailwind CSS, Framer Motion, Zustand; FastAPI, SQLAlchemy 2.x, Pydantic, Supabase Storage, Redis.
**Storage**: PostgreSQL (Supabase) for structured data, Supabase Storage for post/forum attachments, Redis for feed caching and concurrent session management.
**Testing**: Vitest (Unit/Integration), Playwright (E2E), pytest (Backend).
**Target Platform**: Mobile-First Web (PWA).
**Project Type**: Monorepo (Web application with separate frontend/backend).
**Performance Goals**: Feed load < 1.5s, Posting < 5s, 500+ concurrent posters.
**Constraints**: Hierarchical forum structure, real-time-ish feed updates, multi-report flagging logic.
**Scale/Scope**: Moderation dashboard for admins, group-specific internal feeds.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Mobile-First PWA**: ✅ PASSED. Feed and Forums designed for touch interaction and fast loading on 4G.
- **II. Historical Fidelity**: ✅ PASSED. Forums replicate the core spirit of the original platform.
- **III. Modern Tech Stack**: ✅ PASSED. Adheres to FastAPI + Next.js architecture.
- **IV. Community Safety**: ✅ PASSED. Flagging and Moderation Queue are core to this phase.
- **V. Progressive Disclosure**: ✅ PASSED. Building on established Auth, Profile, and Chat foundations.

## Project Structure

### Documentation (this feature)

```text
specs/004-community-features/
├── plan.md              # This file
├── research.md          # Threaded discussion & feed aggregation research
├── data-model.md        # Hierarchical forum and group schemas
├── quickstart.md        # Setup for forum categories and moderation
├── contracts/           # Forum, Feed, and Group API definitions
└── tasks.md             # Actionable tasks
```

### Source Code

```text
frontend/
├── src/app/
│   ├── (protected)/feed/        # Social feed (Global/Following)
│   ├── (protected)/forums/      # Threaded forum categories/topics
│   ├── (protected)/groups/      # User-led group discovery and management
│   └── (admin)/moderation/      # Moderation dashboard
backend/
├── app/api/
│   ├── forums.py                # Hierarchical discussion endpoints
│   ├── feed.py                  # Status updates and feed aggregation
│   ├── groups.py                # Group management
│   └── moderation.py            # Flagging and review logic
└── app/services/
    ├── feed_service.py          # Aggregate feed logic with Redis
    └── moderation_service.py    # Report threshold and notify logic
```

**Structure Decision**: Integrated into existing Monorepo structure.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Hierarchical Data | Threaded forums require parent-child depth | Flat lists lose the "forum" fidelity and conversation flow. |
| Feed Aggregation | Global vs Following tabs require logic | Static feeds don't scale or provide personalized value. |