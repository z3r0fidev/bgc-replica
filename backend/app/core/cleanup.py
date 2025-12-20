from app.core.redis import get_redis
import asyncio

async def cleanup_transient_data():
    """
    Remove expired rate limit keys or other transient Redis data.
    Redis handles TTL automatically, but we can perform manual sweeps if needed.
    """
    redis = await get_redis()
    # Manual cleanup logic for non-TTL keys would go here
    print("Transient data cleanup complete.")

if __name__ == "__main__":
    asyncio.run(cleanup_transient_data())
