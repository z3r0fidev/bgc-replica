import asyncio
import os
import sys
import random
import uuid
from faker import Faker
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

# Add the parent directory to sys.path to allow imports from app
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_root)

# Load .env explicitly
load_dotenv(os.path.join(backend_root, ".env"))

from app.core.database import SessionLocal
from app.models.user import User, Profile
from app.core.security import get_password_hash

fake = Faker()

# Configuration
NUM_PROFILES = 100
START_INDEX = 51 # Start after the original 50

# Demographics
ETHNICITIES = ["Black", "Latino", "White", "Mixed", "Asian", "Middle Eastern", "Other"]
POSITIONS = ["Top", "Bottom", "Versatile", "Versatile Top", "Versatile Bottom"]
BUILDS = ["Slim", "Athletic", "Muscular", "Average", "Large", "Stocky"]
HIV_STATUSES = ["Negative", "Positive", "Undetectable", "Ask Me"]
PRIVACY_MODES = ["OUT", "DOWNLO"]

# Targeted Localities: PHL + North/Central NJ
LOCATIONS = [
    # Philadelphia Metro
    ("Philadelphia", "PA"), ("King of Prussia", "PA"), ("Norristown", "PA"), ("Ardmore", "PA"),
    ("Cherry Hill", "NJ"), ("Camden", "NJ"), ("Mount Laurel", "NJ"), ("Pennsauken", "NJ"),
    # North NJ
    ("Newark", "NJ"), ("Jersey City", "NJ"), ("Hoboken", "NJ"), ("Weehawken", "NJ"),
    ("Paterson", "NJ"), ("Clifton", "NJ"), ("Montclair", "NJ"), ("Hackensack", "NJ"),
    ("Elizabeth", "NJ"), ("Union", "NJ"), ("Morristown", "NJ"),
    # Central NJ
    ("New Brunswick", "NJ"), ("Edison", "NJ"), ("Woodbridge", "NJ"), ("Old Bridge", "NJ"),
    ("Princeton", "NJ"), ("Trenton", "NJ"), ("Hamilton", "NJ"), ("Freehold", "NJ")
]

# Robust Persona Components
ARCHETYPES = [
    {
        "type": "The Career Professional",
        "taglines": [
            "Corporate by day, chill by night.", 
            "Ambitious, driven, and looking for someone who keeps up.",
            "Building a life I don't need a vacation from.",
            "Success is only sweet when shared."
        ],
        "intros": [
            "Just moved to the area for a new role in fintech. Loving the city vibes so far.",
            "I spend most of my week in meetings or at my desk, so I value my downtime.",
            "Philly native, working in healthcare administration. Dedicated to making a difference.",
            "Central NJ based. I commute to the city but love coming home to some peace and quiet."
        ],
        "backgrounds": [
            "MBA holder with a passion for strategic planning and leadership.",
            "Working in the legal field, focusing on civil rights and community advocacy.",
            "Senior consultant for a global firm, frequently traveling but looking for a local connection.",
            "IT Director for a regional hospital system. I like things organized and efficient."
        ],
        "interests": ["Networking", "Golf", "Wine Tasting", "Stocks", "Real Estate", "Fine Dining", "Opera"]
    },
    {
        "type": "The Urban Creative",
        "taglines": [
            "Finding beauty in the concrete jungle.",
            "Art is not what I do, it's who I am.",
            "Good vibes, better music, and deep conversations.",
            "Looking for my next muse."
        ],
        "intros": [
            "I live for the local art scene. You'll probably find me at a gallery opening in Fishtown.",
            "Musician and producer. My studio is my second home.",
            "Freelance photographer capturing the soul of Jersey City.",
            "Writer and poet. I see stories everywhere I look."
        ],
        "backgrounds": [
            "Graduated from Tyler School of Art. Now running my own design studio.",
            "Grew up in Newark, inspired by the murals and the history of the city.",
            "Self-taught chef who views every plate as a canvas.",
            "Fashion designer focusing on sustainable and ethical urban wear."
        ],
        "interests": ["Photography", "Live Music", "Street Art", "Indie Films", "Thrifting", "Vinyl Records", "Poetry"]
    },
    {
        "type": "The Dedicated Athlete",
        "taglines": [
            "Stronger every single day.",
            "Gym is my sanctuary.",
            "Looking for a partner, not just a spectator.",
            "Pushing limits and breaking barriers."
        ],
        "intros": [
            "If I'm not at work, I'm at the gym. Fitness is a lifestyle, not a hobby.",
            "Love a good morning run along the Schuylkill River Trail.",
            "Former D1 athlete still keeping that competitive edge alive.",
            "North NJ based. Catch me hiking the Palisades on my days off."
        ],
        "backgrounds": [
            "Certified personal trainer and nutritionist helping others reach their goals.",
            "Physical therapist with a deep understanding of human performance.",
            "Amateur boxer training for my next match in the Philly circuit.",
            "Crossfit coach who believes in community and hard work."
        ],
        "interests": ["Weightlifting", "Hiking", "Cycling", "Nutrition", "Sports", "Spartan Races", "Yoga"]
    },
    {
        "type": "The Community Pillar",
        "taglines": [
            "Leaving the world better than I found it.",
            "Family, community, and connection.",
            "Grounded, honest, and ready for something real.",
            "A helping hand and an open heart."
        ],
        "intros": [
            "Active in my local church and youth mentorship programs.",
            "Born and raised in Trenton. I'm all about giving back to my neighborhood.",
            "Educator by trade, community advocate by choice.",
            "I value tradition, loyalty, and a good Sunday dinner with family."
        ],
        "backgrounds": [
            "High school teacher with 10 years of experience shaping young minds.",
            "Non-profit director focused on urban renewal and social justice.",
            "Social worker dedicated to supporting families in the Philly area.",
            "Small business owner who believes in the power of local economy."
        ],
        "interests": ["Volunteering", "Cooking", "Gardening", "History", "Mentorship", "Book Club", "Local Politics"]
    },
    {
        "type": "The Tech & Geek Culture",
        "taglines": [
            "Debugging life, one day at a time.",
            "In a world of ones and zeros, I'm looking for a ten.",
            "Logic is the beginning of wisdom.",
            "Gamers don't die, they respawn."
        ],
        "intros": [
            "Full-stack dev who probably spends too much time on Reddit.",
            "Huge fan of sci-fi, fantasy, and everything in between.",
            "If we can talk about the MCU or Star Wars for hours, we'll get along.",
            "Living in Hoboken, working in tech, dreaming of Mars."
        ],
        "backgrounds": [
            "Software engineer at a major tech hub in Princeton.",
            "Data scientist analyzing patterns and predicting the future.",
            "Cybersecurity expert keeping the digital world safe.",
            "Game developer creating immersive worlds from my home office."
        ],
        "interests": ["Gaming", "Anime", "Coding", "Cosplay", "Tech Gadgets", "Board Games", "Astrophysics"]
    }
]

def generate_username(name):
    first = name.split()[0].lower()
    last = name.split()[1].lower() if len(name.split()) > 1 else ""
    
    patterns = [
        f"{first}_{last}",
        f"{first}{random.randint(10, 99)}",
        f"{first[0]}{last}_philly",
        f"jersey_{first}",
        f"{first}.{last}",
        f"real_{first}{last[0] if last else ''}",
        f"{first}_from_the_block",
        f"urban_{first}"
    ]
    return random.choice(patterns)[:30]

def generate_bio(name, archetype):
    tagline = random.choice(archetype["taglines"])
    intro = random.choice(archetype["intros"])
    background = random.choice(archetype["backgrounds"])
    about_me = fake.paragraph(nb_sentences=3)
    interests = random.sample(archetype["interests"], 4)
    
    bio_template = (
        f"**{tagline}**\n\n"
        f"**Intro**: {intro}\n\n"
        f"**Background**: {background}\n\n"
        f"**About Me**: {about_me}\n\n"
        f"**Interests**: {', '.join(interests)}"
    )
    return bio_template

async def seed_expanded_profiles():
    print(f"Seeding {NUM_PROFILES} robust test profiles for PHL/NJ areas...")
    
    async with SessionLocal() as db:
        hashed_pw = get_password_hash("password123")
        
        for i in range(NUM_PROFILES):
            idx = START_INDEX + i
            
            # 1. Identity & Username
            name = fake.name_male()
            username = generate_username(name)
            email = f"{username.replace('_', '').replace('.', '')}{idx}@example.com"
            
            # 2. Archetype Selection
            archetype = random.choice(ARCHETYPES)
            
            # 3. Location
            city, state = random.choice(LOCATIONS)
            
            # 4. Profile Pic (Unique via Seed)
            image_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}&gender=male"

            # 5. User Creation
            user = User(
                email=email,
                name=name,
                hashed_password=hashed_pw,
                image=image_url,
                is_active=True,
                metadata_json={"username": username, "archetype": archetype["type"]}
            )
            db.add(user)
            await db.flush() # Get ID for Profile association

            # 6. Full Robust Profile Creation
            bio_text = generate_bio(name, archetype)
            
            profile = Profile(
                id=user.id,
                bio=bio_text,
                height=f"{random.randint(5,6)}\'{{random.randint(0,11)}}\"",
                weight=random.randint(140, 270),
                ethnicity=random.choice(ETHNICITIES),
                position=random.choice(POSITIONS),
                build=random.choice(BUILDS),
                hiv_status=random.choice(HIV_STATUSES),
                privacy_mode=random.choice(PRIVACY_MODES),
                location_city=city,
                location_state=state,
                is_trans_interested=random.choice([True, False]),
                created_at=fake.date_time_between(start_date='-1y', end_date='now')
            )
            db.add(profile)
            
            if (i + 1) % 10 == 0:
                print(f"  Processed {i + 1}/100 profiles...")
        
        await db.commit()
    print("Robust profile seeding complete.")

if __name__ == "__main__":
    # Ensure we use the correct event loop policy for Windows if needed
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_expanded_profiles())