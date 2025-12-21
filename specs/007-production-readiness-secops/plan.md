# Implementation Plan: Production Readiness & SecOps

## Tech Stack
- **Auth**: Auth.js (NextAuth), JWT, Secure Cookies.
- **Background Tasks**: Celery, Redis.
- **Database Scaling**: PostgreSQL Partitioning (Range).
- **Observability**: OpenTelemetry, Sentry, Prometheus.
- **Security**: FastAPI Limiter, Helmet (Frontend), CSP headers.

## Architecture Changes
- **Unified Security Middleware**: Migration from two independent auth systems to a shared token/session validation pattern.
- **Worker Tier**: Introduction of a dedicated Celery worker service for non-blocking operations.
- **Partitioned Data Model**: Conversion of high-volume tables to partitioned parent/child structures.

## Implementation Phases

### Phase 1: Security Hardening (Highest Priority)
1. Unify NextAuth sessions with Backend JWT validation.
2. Implement strict security headers (CSP, HSTS).
3. Configure distributed rate limiting with Redis.

### Phase 2: Scalability & Async Tier
1. Integrate Celery and set up the background worker.
2. Implement table partitioning for `messages`.
3. Scale WebSockets using Redis Pub/Sub.

### Phase 3: Observability & Quality Assurance
1. Integrate OpenTelemetry for distributed tracing.
2. Configure Sentry environment alerting.
3. Final load testing and security scanning.
