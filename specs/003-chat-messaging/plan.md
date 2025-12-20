# Implementation Plan: Real-Time Chat & Messaging

**Branch**: `003-chat-messaging` | **Date**: 2025-12-20 | **Spec**: [specs/003-chat-messaging/spec.md](spec.md)
**Input**: Feature specification from `/specs/003-chat-messaging/spec.md`

## Summary

Implement a high-performance, bi-directional real-time messaging system supporting both one-on-one Direct Messages and multi-user Public Chat Rooms. The system will feature persistent message history, real-time online presence tracking via Redis, and full media support (photo/video).

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend), Python 3.11+ (Backend)
**Primary Dependencies**: Next.js 14+, Tailwind CSS, Framer Motion, Zustand; FastAPI, SQLAlchemy 2.x, Redis, Socket.io (or Supabase Realtime).
**Storage**: PostgreSQL (Supabase) for message persistence, Redis for presence and caching.
**Testing**: Vitest, Playwright, pytest.
**Target Platform**: Mobile-First Web (PWA).
**Project Type**: Monorepo.
**Performance Goals**: Message latency < 200ms, Presence updates < 2s.
**Constraints**: Bi-directional communication, WebSocket-capable infrastructure.
**Scale/Scope**: Support for concurrent room participants and multiple DM streams.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Mobile-First PWA**: ✅ Real-time updates optimize mobile responsiveness and engagement.
- **II. Historical Fidelity**: ✅ Replicates the iconic "Chat Rooms" feature of legacy BGCLive.
- **III. Modern Tech Stack**: ✅ Adheres to FastAPI + Next.js architecture.
- **IV. Community Safety**: ✅ Block lists (FR-007) and rate-limiting (Edge Cases) are core requirements.
- **V. Progressive Disclosure**: ✅ Phase 3: Builds upon Auth (Phase 1) and Profiles (Phase 2).

## Project Structure

### Documentation (this feature)

```text
specs/003-chat-messaging/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
frontend/
├── src/components/chat/ # Chat-specific UI components
├── src/hooks/use-chat.ts # WebSocket/State management hook
└── src/app/(protected)/chat/ # Chat routing

backend/
├── app/api/chat.py      # Chat room and message endpoints
├── app/services/chat.py # Message broadcasting logic
├── app/core/presence.py # Redis presence tracking
└── app/models/chat.py   # Chat-related SQLAlchemy models
```

**Structure Decision**: Monorepo with dedicated chat service modules in both layers.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| WebSocket Infrastructure | Required for < 200ms latency | Long-polling or HTTP polling is too slow and resource-heavy for mobile. |
| Redis for Presence | Sub-second state synchronization | Database-only status tracking is too slow and puts excessive load on PostgreSQL. |