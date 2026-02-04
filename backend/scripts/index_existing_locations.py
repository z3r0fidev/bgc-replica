import asyncio
import os
import sys
from sqlalchemy import select
from dotenv import load_dotenv

# Add the parent directory to sys.path to allow imports from app
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_root)

# Load .env explicitly
load_dotenv(os.path.join(backend_root, ".env"))

from app.core.database import SessionLocal
from app.models.user import Profile
from app.services.location import index_user_location


async def index_existing_locations():
    print("Indexing existing profiles in Redis for geospatial search...")

    async with SessionLocal() as db:
        result = await db.execute(select(Profile).where(Profile.location_lat is not None))
        profiles = result.scalars().all()

        count = 0
        for profile in profiles:
            if profile.location_lat and profile.location_lng:
                await index_user_location(
                    profile.id, profile.location_lat, profile.location_lng
                )
                count += 1

        print(f"Successfully indexed {count} profiles.")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(index_existing_locations())
