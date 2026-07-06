import logging
from typing import Optional, Type, TypeVar, Callable, Awaitable
from pydantic import BaseModel
from app.core.redis_config import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class CacheService:
    def __init__(self, prefix: str, ttl: int = 3600):
        self.prefix = prefix
        self.ttl = ttl

    async def get_cached_object(self, key: str, schema: Type[T]) -> Optional[T]:
        try:
            redis = await get_redis()
            data = await redis.get(f"{self.prefix}:{key}")
            if data:
                logger.debug(f"Cache hit: {self.prefix}:{key}")
                return schema.model_validate_json(data)
            logger.debug(f"Cache miss: {self.prefix}:{key}")
        except Exception as e:
            logger.warning(f"Redis cache get failed for {self.prefix}:{key}: {e}")
        return None

    async def set_cached_object(self, key: str, obj: T):
        try:
            redis = await get_redis()
            await redis.set(f"{self.prefix}:{key}", obj.model_dump_json(), ex=self.ttl)
            logger.debug(f"Cache set: {self.prefix}:{key} (TTL: {self.ttl}s)")
        except Exception as e:
            logger.warning(f"Redis cache set failed for {self.prefix}:{key}: {e}")

    async def invalidate(self, key: str):
        try:
            redis = await get_redis()
            await redis.delete(f"{self.prefix}:{key}")
            logger.debug(f"Cache invalidated: {self.prefix}:{key}")
        except Exception as e:
            logger.warning(
                f"Redis cache invalidate failed for {self.prefix}:{key}: {e}"
            )

    async def get_or_set(
        self, key: str, schema: Type[T], fetcher: Callable[[], Awaitable[Optional[T]]]
    ) -> Optional[T]:
        """Cache-aside pattern implementation."""
        cached = await self.get_cached_object(key, schema)
        if cached:
            return cached

        fresh = await fetcher()
        if fresh:
            await self.set_cached_object(key, fresh)
        return fresh


# Specific caches with centralized TTL configuration
profile_cache = CacheService(prefix="profile", ttl=settings.PROFILE_CACHE_TTL)
session_cache = CacheService(prefix="session", ttl=86400)  # 24h
