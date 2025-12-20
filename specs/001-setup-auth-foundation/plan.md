# Implementation Plan: Setup Auth & Foundation

**Branch**: `001-setup-auth-foundation` | **Date**: 2025-12-20 | **Spec**: [specs/001-setup-auth-foundation/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-setup-auth-foundation/spec.md`

## Summary

Initialize the BGCLive Replica with a modern, scalable architecture: Next.js frontend with FastAPI backend, using PostgreSQL with SQLAlchemy ORM and Redis caching. Implement the core authentication system using Better Auth with JWT and OAuth2, supporting Google OAuth, Email/Password, and Passkeys (WebAuthn). Establish the project foundation including shadcn/ui component library with Framer Motion for animations, Zustand for state management, database schema with indexes and caching, and enhanced security (rate limiting, security headers). Testing infrastructure includes Vitest + Playwright for frontend, pytest for backend.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend), Python 3.11+ (Backend)
**Primary Dependencies**: Next.js 14+ (App Router), Tailwind CSS 3.x, shadcn/ui, Framer Motion, Zustand; FastAPI, SQLAlchemy 2.x, Pydantic, Better Auth, Redis.
**Storage**: PostgreSQL (via Supabase) with Redis caching.
**Testing**: Vitest + pytest (Unit/Integration), Playwright (E2E).
**Target Platform**: Mobile-First Web (PWA).
**Project Type**: Web Application (Monorepo with separate frontend/backend).
**Performance Goals**: FCP < 2.0s (4G), Login < 5s.
**Constraints**: Offline-capable (PWA), Biometric Auth (Passkeys).
**Scale/Scope**: Foundation for 10k+ users, microservices-ready.

## Security Enhancements (SentinelArch Recommendations)

**Authentication Upgrade**: Use Better Auth for robust, modern authentication with enhanced security patches, WebAuthn support, and privacy features.

**Security Libraries**:
- **next-helmet**: Implement security headers (CSP, HSTS, XSS protection).
- **express-rate-limit**: Add rate limiting to API routes to prevent abuse.
- **@sentry/nextjs**: Integrate error monitoring and logging for security incidents.
- **Zod**: For input validation and type safety.

**Privacy & Compliance**:
- Implement data minimization principles.
- Add consent management for GDPR/CCPA compliance.
- Use LINDDUN framework for privacy threat modeling.

**Secure Coding Practices**:
- Input validation and sanitization.
- CSRF protection (built-in with Better Auth).
- Regular dependency audits with Snyk or Dependabot.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*   **I. Mobile-First PWA**: PASSED. Plan explicitly targets PWA compliance (SC-001) and mobile performance (SC-002).
*   **II. Historical Fidelity**: N/A for foundation.
*   **III. Modern Tech Stack**: PASSED. Updated stack with FastAPI backend, Redis caching, and premium UI libraries.
*   **IV. Community Safety**: PASSED. Enhanced security and privacy measures protect vulnerable users.
*   **V. Progressive Disclosure**: PASSED. This is the first phase.
*   **VI. Scalable Data Layer**: PASSED. PostgreSQL with SQLAlchemy and Redis ensures scalability.
*   **VII. Cutting-Edge Trends**: PASSED. Framer Motion, Better Auth, and modern practices incorporated.

## Project Structure

### Documentation (this feature)

```text
specs/001-setup-auth-foundation/
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # Schema definitions
├── quickstart.md        # Setup instructions
├── contracts/           # API definitions (Auth.js)
└── tasks.md             # Actionable tasks
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Auth routes group
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui primitives
│   │   └── auth/            # Auth-specific components
│   ├── lib/                 # Shared utilities
│   │   └── utils.ts         # Helper functions
│   └── styles/              # (Optional) Additional styles
└── tests/
    ├── e2e/                 # Playwright tests
    └── unit/                # Vitest tests
backend/
├── app/
│   ├── main.py             # FastAPI app
│   ├── api/                # API routers
│   │   ├── auth.py         # Auth endpoints
│   │   └── users.py        # User endpoints
│   ├── core/               # Core config
│   │   ├── config.py       # Settings
│   │   ├── database.py     # DB setup
│   │   └── security.py     # Auth utils
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic schemas
│   └── services/           # Business logic
├── tests/                  # pytest tests
└── alembic/                # DB migrations
```

**Structure Decision**: Single project using `src/` directory convention standard for Next.js.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Async Programming in Backend | High-performance async I/O for scalable APIs | Synchronous Flask/Django rejected due to lower performance for concurrent requests |
| Polyglot Persistence (PostgreSQL + Redis) | Caching for session management and performance | Single DB rejected due to read-heavy loads and slow queries at scale |
| Motion/Animation Libraries | Premium UX with fluid interactions | Static CSS rejected due to lack of modern, engaging animations |
| Advanced Security Headers & Monitoring | Privacy and security for community safety | Basic auth rejected due to vulnerability risks in social platform |