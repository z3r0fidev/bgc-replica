# Tasks: Phase 7 - Production Readiness & SecOps

## Phase 1: Security Hardening

- [x] T001 Implement unified authentication: Share NextAuth secret with FastAPI and validate JWT in `backend/app/api/deps.py`
- [x] T002 Configure strict security headers (CSP, HSTS) in `frontend/next.config.ts` and `backend/app/core/middleware.py`
- [x] T003 Implement distributed rate limiting using `fastapi-limiter` and Redis in `backend/app/main.py`
- [x] T004 Add input sanitization for chat messages to prevent XSS in `backend/app/services/chat.py`

## Phase 2: Scalability & Async Tier

- [x] T005 [P] Setup Celery configuration in `backend/app/core/celery.py` and create initial background tasks
- [x] T006 Implement range partitioning for `messages` table in `backend/alembic/versions/`
- [x] T007 Configure Redis Pub/Sub for scalable WebSocket message broadcasting in `backend/app/core/socket.py`

## Phase 3: Observability & Monitoring

- [x] T008 [P] Integrate OpenTelemetry instrumentation in FastAPI and Next.js
- [x] T009 Finalize Sentry production configuration with environment-specific tags and error sampling
- [x] T010 Configure automated log rotation using Python's `logging.handlers.TimedRotatingFileHandler`

## Execution Order
1. **Setup**: T001, T005.
2. **Security**: T002, T003, T004.
3. **Data/Scaling**: T006, T007.
4. **Ops**: T008, T009, T010.
