import json
from typing import Any, Optional, Type, TypeVar, Callable, Awaitable
from pydantic import BaseModel
from app.core.redis import get_redis
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

T = TypeVar("T", bound=BaseModel)

class CacheService:
    def __init__(self, prefix: str, ttl: int = 3600):
        self.prefix = prefix
        self.ttl = ttl

    async def get_cached_object(self, key: str, schema: Type[T]) -> Optional[T]:
        redis = await get_redis()
        data = await redis.get(f"{self.prefix}:{key}")
        if data:
            return schema.model_validate_json(data)
        return None

    async def set_cached_object(self, key: str, obj: T):
        redis = await get_redis()
        await redis.setex(
            f"{self.prefix}:{key}",
            self.ttl,
            obj.model_dump_json()
        )

    async def invalidate(self, key: str):
        redis = await get_redis()
        await redis.delete(f"{self.prefix}:{key}")

    async def get_or_set(
        self, 
        key: str, 
        schema: Type[T], 
        fetcher: Callable[[], Awaitable[Optional[T]]]
    ) -> Optional[T]:
        """Cache-aside pattern implementation."""
        cached = await self.get_cached_object(key, schema)
        if cached:
            return cached
        
        fresh = await fetcher()
        if fresh:
            await self.set_cached_object(key, fresh)
        return fresh

# Specific caches
profile_cache = CacheService(prefix="profile", ttl=3600)
session_cache = CacheService(prefix="session", ttl=86400) # 24h
