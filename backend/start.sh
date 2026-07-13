#!/bin/sh
# Railway deploys both the web app and the Celery worker from this same
# backend/railway.json (one service can't have two different startCommands
# via a dashboard override alone - that setting gets ignored in favor of
# this file). RAILWAY_SERVICE_NAME is injected automatically per-service,
# so branch on it here instead of relying on a dashboard-only setting.
set -e

if [ "$RAILWAY_SERVICE_NAME" = "celery-worker" ]; then
    exec celery -A app.services.tasks worker --loglevel=info --concurrency=2
else
    alembic upgrade head
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi
