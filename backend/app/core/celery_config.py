from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery("worker", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Weekly rather than monthly: create_monthly_partition is idempotent
# (CREATE TABLE IF NOT EXISTS), so extra runs are free, and a weekly cadence
# means at most a few days of drift if one run fails - vs. up to a month
# with a single monthly fire, which is exactly how the Dec 2025 messages
# partitioning went unmaintained.
celery_app.conf.beat_schedule = {
    "ensure-future-partitions": {
        "task": "app.services.tasks.ensure_future_partitions",
        "schedule": crontab(day_of_week="monday", hour=3, minute=0),
    },
}

# Autodiscover tasks in the app
celery_app.autodiscover_tasks(["app.services"])


@celery_app.task
def test_task(arg):
    return f"Test task executed with {arg}"
