from app.core.celery import celery_app
from app.core.redis import get_redis
import asyncio
import time
import uuid
from typing import List

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
