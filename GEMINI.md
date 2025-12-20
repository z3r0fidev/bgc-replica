# BGCLive Replica Project Context

## Current Status: Phase 1 Complete (Auth & Foundation)
The project has successfully transitioned from the planning phase to active development. The core infrastructure, authentication system, and frontend/backend integration are established.

## Monorepo Directory Overview
- **`frontend/`**: Next.js 14+ (App Router) project with TypeScript, Tailwind CSS, shadcn/ui, and Framer Motion. Handles the PWA mobile-first UI.
- **`backend/`**: FastAPI (Python 3.11+) backend with SQLAlchemy (PostgreSQL via Supabase) and Redis caching. Manages authentication, user data, and core APIs.
- **`specs/`**: Contains architectural blueprints, specifications, implementation plans, and completed task lists for each feature.
- **`assets/`**: Repository for branding assets, icons, and placeholder images.

## Key Completed Features
- **PWA Foundation**: Responsive landing page and PWA manifest configured.
- **Unified Authentication**: JWT-based login and registration with session management.
- **Scalable Data Layer**: SQLAlchemy models for Users, Accounts, and Sessions with PostgreSQL and Redis.
- **Premium UI Baseline**: Initial layout and auth pages built using shadcn/ui and animations.

## Key Reference Files
### `RESEARCH_SUMMARY.md`
Historical analysis of the original `bgclive.com` to ensure fidelity in demographics and features.

### `REPLICATION_GUIDE.md`
The master technical roadmap for the project modernization.

### `AGENTS.md`
Runtime guidance for AI agents, including build, lint, and test commands.

## Next Steps
1. **Phase 2: User Profiles**: Implement detailed profile management, photo galleries, and social graph (friends/favorites).
2. **Phase 3: Real-time Chat**: Develop direct messaging and location-based chat rooms.
3. **Phase 4: Community Features**: Build discussion boards and social feeds.
