import redis.asyncio as redis
from app.core.config import settings
import json

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

async def get_redis():
    return redis_client

async def set_session(session_token: str, user_id: str, expire: int = 86400):
    await redis_client.setex(
        f"session:{session_token}",
        expire,
        json.dumps({"user_id": user_id})
    )

async def get_session(session_token: str):
    data = await redis_client.get(f"session:{session_token}")
    if data:
        return json.loads(data)
    return None

async def delete_session(session_token: str):
    await redis_client.delete(f"session:{session_token}")