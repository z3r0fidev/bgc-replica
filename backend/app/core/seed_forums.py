import asyncio
import uuid
from app.core.database import SessionLocal
from app.models.user import User  # noqa: F401
from app.models.community import ForumCategory

async def seed_categories():
    categories = [
        {"name": "General", "slug": "general", "description": "General community discussions."},
        {"name": "Health & Wellness", "slug": "health", "description": "Discussions on physical and mental health."},
        {"name": "Local Events", "slug": "events", "description": "Find and share local community events."},
        {"name": "Hot Topics", "slug": "hot-topics", "description": "Trending and controversial discussions."},
        {"name": "Support", "slug": "support", "description": "Community support and resources."},
    ]

    async with SessionLocal() as db:
        for cat_data in categories:
            # Check if exists
            from sqlalchemy import select
            stmt = select(ForumCategory).where(ForumCategory.slug == cat_data["slug"])
            result = await db.execute(stmt)
            if not result.scalars().first():
                new_cat = ForumCategory(**cat_data)
                db.add(new_cat)
        
        await db.commit()
        print("Forum categories seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_categories())
