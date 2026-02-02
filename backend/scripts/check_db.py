import asyncio
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.user import Profile


async def check():
    async with SessionLocal() as db:
        res = await db.execute(select(Profile))
        profiles = res.scalars().all()
        print(f"Total profiles: {len(profiles)}")
        personal_profiles = [p for p in profiles if p.is_personal]
        print(f"Personal profiles: {len(personal_profiles)}")


if __name__ == "__main__":
    asyncio.run(check())
