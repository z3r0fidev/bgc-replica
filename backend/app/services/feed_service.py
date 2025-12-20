from typing import List, Optional
import time
from app.core.redis import get_redis
import uuid

class FeedService:
    async def add_post_to_feeds(self, post_id: uuid.UUID, author_id: uuid.UUID, follower_ids: List[uuid.UUID]):
        """
        Fan-out-on-Write: Add post to global feed and all followers' feeds.
        """
        redis = await get_redis()
        timestamp = int(time.time())
        post_id_str = str(post_id)

        # 1. Add to Global Feed
        await redis.zadd("feed:global", {post_id_str: timestamp})

        # 2. Add to Follower Feeds (Personalized)
        for follower_id in follower_ids:
            await redis.zadd(f"feed:user:{follower_id}", {post_id_str: timestamp})
            # Optional: Trim feed to last 500 items to save memory
            await redis.zremrangebyrank(f"feed:user:{follower_id}", 0, -501)

    async def get_feed(self, user_id: Optional[uuid.UUID] = None, limit: int = 20, offset: int = 0) -> List[str]:
        """
        Retrieve post IDs from either personalized feed or global feed.
        """
        redis = await get_redis()
        key = f"feed:user:{user_id}" if user_id else "feed:global"
        
        # ZREVRANGE for reverse chronological order
        return await redis.zrevrange(key, offset, offset + limit - 1)

feed_service = FeedService()
