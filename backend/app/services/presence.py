from typing import List, Optional
import time
from app.core.redis import get_redis
import uuid

class PresenceService:
    def __init__(self):
        self.presence_key = "presence:online"

    async def update_presence(self, user_id: uuid.UUID, status: str = "online"):
        """
        Update user's last seen timestamp in Redis.
        """
        redis = await get_redis()
        timestamp = int(time.time())
        await redis.zadd(self.presence_key, {str(user_id): timestamp})
        # Set a secondary key for status if needed (idle, etc)
        await redis.setex(f"presence:status:{user_id}", 60, status)

    async def get_online_users(self) -> List[str]:
        """
        Get list of user IDs who have been seen in the last 60 seconds.
        """
        redis = await get_redis()
        now = int(time.time())
        cutoff = now - 60
        return await redis.zrangebyscore(self.presence_key, cutoff, "+inf")

    async def is_user_online(self, user_id: uuid.UUID) -> bool:
        """
        Check if a specific user is online.
        """
        redis = await get_redis()
        score = await redis.zscore(self.presence_key, str(user_id))
        if score is None:
            return False
        return score >= (time.time() - 60)

    async def clear_offline_users(self):
        """
        Optional: Remove users who haven't been seen for a long time.
        """
        redis = await get_redis()
        cutoff = int(time.time()) - 3600 # 1 hour
        await redis.zremrangebyscore(self.presence_key, "-inf", cutoff)

presence_service = PresenceService()
