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

    async def get_feed(self, user_id: Optional[uuid.UUID] = None, limit: int = 20, cursor: Optional[float] = None) -> List[str]:
        """
        Retrieve post IDs using score-based (timestamp) cursor pagination.
        """
        redis = await get_redis()
        key = f"feed:user:{user_id}" if user_id else "feed:global"
        
        # If no cursor, use +inf (latest)
        max_score = cursor if cursor is not None else "+inf"
        
        # Fetch limit + 1 to detect has_next
        return await redis.zrevrangebyscore(key, max_score, "-inf", start=0, num=limit + 1)

feed_service = FeedService()
