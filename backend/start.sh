#!/bin/sh
# Railway deploys both the web app and the Celery worker from this same
# backend/railway.json (one service can't have two different startCommands
# via a dashboard override alone - that setting gets ignored in favor of
# this file). RAILWAY_SERVICE_NAME is injected automatically per-service,
# so branch on it here instead of relying on a dashboard-only setting.
set -e

if [ "$RAILWAY_SERVICE_NAME" = "celery-worker" ]; then
    # --beat runs the scheduler embedded in this same process (ensure_future_partitions
    # and any future scheduled tasks) rather than needing a third Railway service.
    exec celery -A app.services.tasks worker --beat --loglevel=info --concurrency=2
else
    alembic upgrade head
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi
