import asyncio
import os
import sys
import uuid
from sqlalchemy import select

# Add the parent directory to sys.path to allow imports from app
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_root)

from app.core.database import SessionLocal
from app.models.community import ForumCategory, ForumThread, ForumPost
from app.models.user import User

async def seed_forums():
    async with SessionLocal() as db:
        # Get a user for authoring
        user_result = await db.execute(select(User).limit(1))
        user = user_result.scalars().first()
        if not user:
            print("ERROR: No users found to author threads.")
            return

        # 1. Create Main Categories
        categories = [
            {"name": "General", "slug": "general", "description": "Global community lounge"},
            {"name": "Local Discussion", "slug": "local", "description": "City-specific boards"},
            {"name": "Health & Wellness", "slug": "health", "description": "Resource and support"},
        ]

        for cat_data in categories:
            stmt = select(ForumCategory).where(ForumCategory.slug == cat_data["slug"])
            result = await db.execute(stmt)
            if not result.scalars().first():
                cat = ForumCategory(**cat_data)
                db.add(cat)
        
        await db.commit()

        # 2. Create Sub-forums
        parent_result = await db.execute(select(ForumCategory).where(ForumCategory.slug == "local"))
        local_parent = parent_result.scalars().first()
        
        if local_parent:
            subforums = [
                {"name": "Philadelphia", "slug": "philadelphia", "parent_id": local_parent.id, "banner_path": "/assets/personals/banners/transxHeader.png"},
                {"name": "New Jersey", "slug": "new-jersey", "parent_id": local_parent.id, "banner_path": "/assets/personals/banners/desktopSidePanelHeader.png"},
            ]
            for sub_data in subforums:
                stmt = select(ForumCategory).where(ForumCategory.slug == sub_data["slug"])
                result = await db.execute(stmt)
                if not result.scalars().first():
                    sub = ForumCategory(**sub_data)
                    db.add(sub)
            await db.commit()

        # 3. Create Sample Threads
        sub_result = await db.execute(select(ForumCategory).where(ForumCategory.slug == "philadelphia"))
        philly = sub_result.scalars().first()
        
        if philly:
            for i in range(15):
                thread = ForumThread(
                    category_id=philly.id,
                    author_id=user.id,
                    title=f"Sample Philly Discussion #{i+1}",
                    content="This is a test thread for the new high-density layout.",
                    is_sticky=(i == 0),
                    view_count=100 + i * 5,
                    reply_count=10 + i
                )
                db.add(thread)
            await db.commit()

        print("Hierarchical forums seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_forums())
