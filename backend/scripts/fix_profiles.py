import asyncio
from sqlalchemy import select, update
from app.core.database import SessionLocal
from app.models.user import Profile


async def mark_personal():
    async with SessionLocal() as db:
        # Mark all existing profiles as personal for testing purposes
        # or a subset of them.
        stmt = update(Profile).values(is_personal=True)
        await db.execute(stmt)
        await db.commit()
        print("Successfully marked all profiles as is_personal=True")


if __name__ == "__main__":
    asyncio.run(mark_personal())
