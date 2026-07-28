from app.core.celery_config import celery_app
from app.core.redis_config import get_redis
from app.core.partitioning import PARTITIONED_TABLES
import asyncio
import time
from datetime import datetime, timedelta
from typing import List, Optional


# Celery tasks are usually synchronous, but we can wrap async calls
def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.services.tasks.fan_out_post")
def fan_out_post(post_id_str: str, follower_ids_str: List[str]):
    async def _fan_out():
        redis = await get_redis()
        timestamp = int(time.time())

        # Add to Global Feed
        await redis.zadd("feed:global", {post_id_str: timestamp})

        # Add to Follower Feeds
        for follower_id in follower_ids_str:
            await redis.zadd(f"feed:user:{follower_id}", {post_id_str: timestamp})
            await redis.zremrangebyrank(f"feed:user:{follower_id}", 0, -501)

    run_async(_fan_out())


@celery_app.task(name="app.services.tasks.send_verification_email_task")
def send_verification_email_task(
    to_email: str, token: str, user_name: Optional[str] = None
):
    """
    Celery task to send verification email asynchronously.

    Args:
        to_email: Recipient email address
        token: Plain verification token
        user_name: Optional user name for personalization
    """

    async def _send_email():
        from app.services.email_service import email_service

        return await email_service.send_verification_email(
            to_email=to_email,
            token=token,
            user_name=user_name,
        )

    return run_async(_send_email())


@celery_app.task(name="app.services.tasks.ensure_future_partitions")
def ensure_future_partitions():
    """
    Create next month's partition for messages and status_updates, ahead of
    need. Idempotent (create_monthly_partition uses CREATE TABLE IF NOT
    EXISTS). Re-raises on failure so Celery marks the task failed and it's
    visible in worker logs/monitoring - this exact silent-failure mode is
    what let the Dec 2025 messages partitioning go unmaintained for months.
    """

    async def _ensure():
        from sqlalchemy import text

        from app.core.database import create_scoped_engine

        # A scoped engine, not the shared app.core.database.engine/
        # SessionLocal singleton - run_async() gives this call its own
        # event loop and closes it on return, but the shared engine's
        # pooled connections persist across calls for the worker process's
        # whole lifetime. A second call reusing a pooled connection tied to
        # a now-closed loop fails ("Event loop is closed" or "attached to
        # a different loop" once other code has touched the shared engine
        # under yet another loop in between). See create_scoped_engine's
        # docstring.
        scoped_engine, scoped_session_factory = create_scoped_engine()
        target_date = (datetime.utcnow() + timedelta(days=31)).date()
        created = []
        try:
            async with scoped_session_factory() as db:
                for table in PARTITIONED_TABLES:
                    result = await db.execute(
                        text("SELECT create_monthly_partition(:table, :target_date)"),
                        {"table": table, "target_date": target_date},
                    )
                    created.append(result.scalar_one())
                await db.commit()
        finally:
            await scoped_engine.dispose()
        return created

    try:
        return run_async(_ensure())
    except Exception as e:
        print(f"Failed to ensure future partitions: {e}")
        raise


@celery_app.task(name="app.services.tasks.send_password_reset_email_task")
def send_password_reset_email_task(
    to_email: str, token: str, user_name: Optional[str] = None
):
    """
    Celery task to send password reset email asynchronously.

    Args:
        to_email: Recipient email address
        token: Plain reset token
        user_name: Optional user name for personalization
    """

    async def _send_email():
        from app.services.email_service import email_service

        return await email_service.send_password_reset_email(
            to_email=to_email,
            token=token,
            user_name=user_name,
        )

    return run_async(_send_email())


@celery_app.task(name="app.services.tasks.send_warning_email_task")
def send_warning_email_task(
    to_email: str,
    reason: str,
    warning_count: int,
    threshold: int,
    escalated: bool,
    user_name: Optional[str] = None,
):
    """
    Celery task to send a moderation warning email asynchronously.

    Args:
        to_email: Recipient email address
        reason: Reason the warning was issued
        warning_count: Recipient's current active warning count (including this one)
        threshold: Number of active warnings that triggers automatic suspension
        escalated: Whether this warning pushed the user over the threshold
        user_name: Optional user name for personalization
    """

    async def _send_email():
        from app.services.email_service import email_service

        return await email_service.send_warning_email(
            to_email=to_email,
            reason=reason,
            warning_count=warning_count,
            threshold=threshold,
            escalated=escalated,
            user_name=user_name,
        )

    return run_async(_send_email())


@celery_app.task(name="app.services.tasks.send_new_message_email_task")
def send_new_message_email_task(
    to_email: str,
    sender_name: str,
    message_preview: str,
    to_user_name: Optional[str] = None,
):
    """Celery task to notify a user of a new DM received while offline."""

    async def _send_email():
        from app.services.email_service import email_service

        return await email_service.send_new_message_email(
            to_email=to_email,
            sender_name=sender_name,
            message_preview=message_preview,
            to_user_name=to_user_name,
        )

    return run_async(_send_email())


@celery_app.task(name="app.services.tasks.send_friend_request_email_task")
def send_friend_request_email_task(
    to_email: str,
    sender_name: str,
    to_user_name: Optional[str] = None,
):
    """Celery task to notify a user of a new friend/connection request."""

    async def _send_email():
        from app.services.email_service import email_service

        return await email_service.send_friend_request_email(
            to_email=to_email,
            sender_name=sender_name,
            to_user_name=to_user_name,
        )

    return run_async(_send_email())


@celery_app.task(name="app.services.tasks.send_mention_email_task")
def send_mention_email_task(
    to_email: str,
    mentioner_name: str,
    thread_title: str,
    content_preview: str,
    thread_id: str,
    to_user_name: Optional[str] = None,
):
    """Celery task to notify a user they were @mentioned in a forum post."""

    async def _send_email():
        from app.services.email_service import email_service

        return await email_service.send_mention_email(
            to_email=to_email,
            mentioner_name=mentioner_name,
            thread_title=thread_title,
            content_preview=content_preview,
            thread_id=thread_id,
            to_user_name=to_user_name,
        )

    return run_async(_send_email())
