from app.core.celery_config import celery_app
from app.core.redis_config import get_redis
import asyncio
import time
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
