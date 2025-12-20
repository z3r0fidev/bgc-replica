from typing import Optional, Dict
import httpx
from app.core.config import settings
from app.core.redis import get_redis
import uuid

async def get_location_from_ip(ip: str) -> Optional[Dict]:
    """
    Get city, state, lat, lng from IP using ip-api.com (free for development).
    """
    if ip == "127.0.0.1" or ip.startswith("192.168."):
        # Return mock location for local dev
        return {
            "city": "New York",
            "state": "NY",
            "lat": 40.7128,
            "lng": -74.0060
        }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{ip}")
            data = response.json()
            if data["status"] == "success":
                return {
                    "city": data.get("city"),
                    "state": data.get("regionName"),
                    "lat": data.get("lat"),
                    "lng": data.get("lon")
                }
    except Exception as e:
        print(f"Geolocation error: {e}")
    
    return None

async def index_user_location(user_id: uuid.UUID, lat: float, lng: float):
    """
    Add user to Redis Geo index.
    """
    redis = await get_redis()
    await redis.geoadd("geo:users", (lng, lat, str(user_id)))

async def search_users_nearby(lat: float, lng: float, radius_km: float = 50):
    """
    Search for users within a radius in Redis.
    """
    redis = await get_redis()
    # GEORADIUS is deprecated in some versions, but supported in many. 
    # Use GEOSEARCH for modern Redis.
    try:
        results = await redis.geosearch(
            "geo:users",
            longitude=lng,
            latitude=lat,
            radius=radius_km,
            unit="km",
            withcoord=True,
            withdist=True
        )
        return results
    except Exception as e:
        # Fallback for older redis versions if needed
        print(f"Redis GeoSearch error: {e}")
        return []
