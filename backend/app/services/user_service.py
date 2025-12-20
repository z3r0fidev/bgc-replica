from typing import Optional
import uuid
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.redis import get_redis
from app.schemas.user import User as UserSchema

async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    redis = await get_redis()
    cache_key = f"user:{user_id}"
    
    # Try Cache
    cached_user = await redis.get(cache_key)
    if cached_user:
        user_data = json.loads(cached_user)
        # Reconstruct model or return as dict? Usually better to return model for DB consistency
        # but for performance we might return schema
        return UserSchema(**user_data)
    
    # Try DB
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if user:
        # Save to Cache
        user_schema = UserSchema.model_validate(user)
        await redis.setex(cache_key, 3600, user_schema.model_dump_json())
    
    return user

async def invalidate_user_cache(user_id: uuid.UUID):
    redis = await get_redis()
    await redis.delete(f"user:{user_id}")
