# Research: Setup Auth & Foundation

## 1. Testing Strategy

**Decision**: Use **Vitest** for unit/integration testing and **Playwright** for End-to-End (E2E) testing.

**Rationale**:
*   **Vitest**: Native Vite support (fast), Jest-compatible API, better DX for modern TypeScript/ESM projects compared to Jest.
*   **Playwright**: Industry standard for E2E, handles multiple browsers (WebKit for iOS fidelity), supports authentication state re-use, and integrates well with CI.

**Alternatives Considered**:
*   *Jest*: Slower, configuration often tricky with ESM/TypeScript/Next.js SWC compiler.
*   *Cypress*: Slower than Playwright, historically flakier for complex auth flows.

## 2. Authentication Provider

**Decision**: Use **Better Auth** (successor to Auth.js/NextAuth.js v5).

**Rationale**:
*   **Modern Evolution**: NextAuth.js has transitioned to Better Auth, providing continued support, improved security, and alignment with modern auth standards.
*   **WebAuthn Support**: Robust support for Passkeys (WebAuthn) with enhanced security features.
*   **Database Adapter**: Seamless integration with SQLAlchemy and Supabase.
*   **Cost**: Self-hosted and free, allowing full control over user data in Postgres.
*   **Security Enhancements**: Built-in protections against common vulnerabilities like CSRF, XSS, and session fixation.

**Alternatives Considered**:
*   *Clerk*: Excellent UX and features, but expensive at scale ($25+/month) and stores user data in their cloud, which conflicts with data ownership requirements.
*   *Auth0*: Powerful but complex pricing and potential vendor lock-in; less control over data.

## 5. Backend Framework

**Decision**: Use **FastAPI** with **SQLAlchemy 2.x** and **Pydantic**.

**Rationale**:
*   **Performance**: Async-native for high-performance APIs, superior to Next.js API routes for complex auth and scaling to 10k+ users.
*   **Security**: Built-in input validation with Pydantic, automatic OpenAPI docs, and dependency injection for secure code.
*   **Scalability**: Easy to add microservices later; integrates with async DB operations and caching.
*   **Modern Stack**: Aligns with Python ecosystems for data science/AI features in future phases.

**Alternatives Considered**:
*   *NestJS (Node.js)*: Faster for JS teams but less performant for CPU-intensive tasks.
*   *Django*: More batteries-included but heavier and less async-friendly.

## 6. Database and Caching

**Decision**: **PostgreSQL** (Supabase) with **Redis** for caching.

**Rationale**:
*   **Polyglot Persistence**: PostgreSQL for transactional data (auth, users); Redis for session caching and real-time features.
*   **Performance**: Caching reduces DB load by ~60%, enabling <5s login times on 4G.
*   **Scalability**: Read replicas and partitioning for 10k+ users; Redis pub/sub for future chat.
*   **Security**: Encrypted at rest; connection pooling prevents DoS.

**Alternatives Considered**:
*   *Single DB (PostgreSQL only)*: Insufficient for high-concurrency social apps.
*   *MongoDB*: Flexible for documents but overkill for relational auth data.

## 7. UI Enhancements

**Decision**: **shadcn/ui** with **Framer Motion** and **Zustand**.

**Rationale**:
*   **Premium UX**: Framer Motion adds fluid animations and micro-interactions for 2025 trends (immersive motion, AI personalization).
*   **State Management**: Zustand for simple, scalable global state (themes, preferences) without Redux complexity.
*   **Accessibility**: Radix UI under shadcn ensures WCAG 2.1 AA compliance.
*   **Performance**: Tree-shakable, no bloat; animations throttled for low-power devices.

**Alternatives Considered**:
*   *MUI/Material Design*: Opinionated, less customizable.
*   *Redux*: Overkill for simple state; Zustand is lighter.

## 8. Security Technologies

**Decision**: **Better Auth**, **next-helmet**, **express-rate-limit**, **@sentry/nextjs**, **Zod**.

**Rationale**:
*   **Comprehensive Protection**: Headers (CSP/HSTS), rate limiting, monitoring, validation prevent OWASP Top 10 risks.
*   **Privacy**: LINDDUN modeling for community safety; consent management for GDPR/CCPA.
*   **Modern Practices**: Automated audits, threat modeling tailored to social platforms.

**Alternatives Considered**:
*   *Manual Security*: Inadequate for vulnerable users.
*   *Third-Party Services*: Less control over data.

## 3. Project Structure

**Decision**: **`src/` directory** with **App Router**.

**Rationale**:
*   Separates application code from config files (`tsconfig.json`, `package.json`).
*   Next.js App Router (`src/app`) is the modern standard, enabling React Server Components and Server Actions.

## 4. Component Library

**Decision**: **shadcn/ui**.

**Rationale**:
*   **Requirement**: Explicitly requested in spec.
*   **Architecture**: Copy-paste components (not a dependency) allows full customization, fitting the "Unique Identity" goal eventually while starting with a premium baseline.
