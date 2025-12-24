import asyncio
import uuid
import random
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.user import User, Profile
from app.models.social import PersonalPost

DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed_posts():
    async with AsyncSessionLocal() as db:
        # Fetch some users who have personal profiles
        result = await db.execute(
            select(User).join(Profile).where(Profile.is_personal == True).limit(20)
        )
        users = result.scalars().all()
        
        if not users:
            print("No personal profiles found. Please seed profiles first.")
            return

        categories = ["transx", "milfy", "gay", "queer", "reviewed", "alligator", "aaok"]
        
        contents = [
            "<p>Looking for someone to hang out with this weekend in Philly! #chill</p>",
            "<p>New in town, wanting to explore the city. Anyone free for a drink? 🍸</p>",
            "<p><b>Discrete and respectful.</b> Top looking for bottom. HMU.</p>",
            "<p>Just moved here from Jersey. Love the vibe! Let's connect.</p>",
            "<p>Any trans-friendly spaces recommended in the area?</p>",
            "<p>Looking for a regular workout partner. 💪</p>",
            "<p>Late night adventures? Anyone? 🌙</p>"
        ]

        for user in users:
            # Create 1-2 posts per user
            num_posts = random.randint(1, 2)
            for _ in range(num_posts):
                new_post = PersonalPost(
                    author_id=user.id,
                    category_slug=random.choice(categories),
                    content=random.choice(contents),
                    follow_count=random.randint(0, 50),
                    comment_count=random.randint(0, 20)
                )
                db.add(new_post)
        
        await db.commit()
        print(f"Successfully seeded posts for {len(users)} users.")

if __name__ == "__main__":
    asyncio.run(seed_posts())
