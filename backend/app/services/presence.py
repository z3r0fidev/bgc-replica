from typing import List
import time
from app.core.redis_config import get_redis
import uuid


class PresenceService:
    def __init__(self):
        self.presence_key = "presence:online"

    async def update_presence(self, user_id: uuid.UUID, status: str = "online"):
        """
        Update user's last seen timestamp in Redis.
        """
        try:
            redis = await get_redis()
            timestamp = int(time.time())
            await redis.zadd(self.presence_key, {str(user_id): timestamp})
            # Set a secondary key for status if needed (idle, etc)
            await redis.setex(f"presence:status:{user_id}", 60, status)
        except Exception:
            pass  # Redis unavailable, skip presence update

    async def get_online_users(self) -> List[str]:
        """
        Get list of user IDs who have been seen in the last 60 seconds.
        """
        try:
            redis = await get_redis()
            now = int(time.time())
            cutoff = now - 60
            return await redis.zrangebyscore(self.presence_key, cutoff, "+inf")
        except Exception:
            return []  # Redis unavailable, return empty list

    async def is_user_online(self, user_id: uuid.UUID) -> bool:
        """
        Check if a specific user is online.
        """
        try:
            redis = await get_redis()
            score = await redis.zscore(self.presence_key, str(user_id))
            if score is None:
                return False
            return score >= (time.time() - 60)
        except Exception:
            return False  # Redis unavailable, assume offline

    async def clear_offline_users(self):
        """
        Optional: Remove users who haven't been seen for a long time.
        """
        try:
            redis = await get_redis()
            cutoff = int(time.time()) - 3600  # 1 hour
            await redis.zremrangebyscore(self.presence_key, "-inf", cutoff)
        except Exception:
            pass  # Redis unavailable, skip cleanup

    async def join_forum(self, forum_id: uuid.UUID, user_id: uuid.UUID):
        try:
            redis = await get_redis()
            await redis.sadd(f"forum:{forum_id}:active_users", str(user_id))
        except Exception:
            pass  # Redis unavailable

    async def leave_forum(self, forum_id: uuid.UUID, user_id: uuid.UUID):
        try:
            redis = await get_redis()
            await redis.srem(f"forum:{forum_id}:active_users", str(user_id))
        except Exception:
            pass  # Redis unavailable

    async def get_forum_active_count(self, forum_id: uuid.UUID) -> int:
        try:
            redis = await get_redis()
            return await redis.scard(f"forum:{forum_id}:active_users")
        except Exception:
            return 0  # Redis unavailable, return 0


presence_service = PresenceService()
