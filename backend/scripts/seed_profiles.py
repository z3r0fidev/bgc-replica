import asyncio
import os
import sys
import random
from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User, Profile
from app.core.security import get_password_hash

fake = Faker()

ETHNICITIES = ["Black", "Latino", "Mixed", "Other"]
POSITIONS = ["Top", "Bottom", "Versatile", "Versatile Top", "Versatile Bottom"]
BUILDS = ["Slim", "Athletic", "Muscular", "Average", "Large"]
PRIVACY_MODES = ["OUT", "DOWNLO"]
HIV_STATUSES = ["Negative", "Positive", "Ask Me"]
CITIES_TRISTATE = [
    ("Philadelphia", "PA"), ("Pittsburgh", "PA"), ("Allentown", "PA"),
    ("New York", "NY"), ("Brooklyn", "NY"), ("Queens", "NY"), ("Bronx", "NY"),
    ("Newark", "NJ"), ("Jersey City", "NJ"), ("Paterson", "NJ"), ("Trenton", "NJ"),
    ("Camden", "NJ"), ("Atlantic City", "NJ")
]

async def seed_profiles():
    print("Seeding 50 test profiles...")
    async with SessionLocal() as db:
        for i in range(50):
            email = f"testuser{i+1}@example.com"
            # Check if user exists
            result = await db.execute(select(User).where(User.email == email))
            if result.scalars().first():
                continue

            city, state = random.choice(CITIES_TRISTATE)
            
            user = User(
                email=email,
                name=fake.name_male(),
                hashed_password=get_password_hash("password123"),
                is_active=True
            )
            db.add(user)
            await db.flush() # get ID

            profile = Profile(
                id=user.id,
                bio=fake.text(max_nb_chars=200),
                height=f"{random.randint(5,6)}'{random.randint(0,11)}",
                weight=random.randint(140, 250),
                ethnicity=random.choice(ETHNICITIES),
                position=random.choice(POSITIONS),
                build=random.choice(BUILDS),
                hiv_status=random.choice(HIV_STATUSES),
                privacy_mode=random.choice(PRIVACY_MODES),
                location_city=city,
                location_state=state,
                is_trans_interested=random.choice([True, False])
            )
            db.add(profile)
        
        await db.commit()
    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed_profiles())
