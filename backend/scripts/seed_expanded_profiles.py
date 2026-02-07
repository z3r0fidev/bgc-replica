import asyncio
import os
import sys
import random
import json
from faker import Faker
from dotenv import load_dotenv
import openai

# Add the backend directory to sys.path to allow imports from app
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)

# Load .env from the backend directory
load_dotenv(os.path.join(backend_root, ".env"))

# Initialize OpenAI client
client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

from app.core.database import SessionLocal
from app.models.user import User, Profile
from app.core.security import get_password_hash

fake = Faker()

# Configuration
NUM_PROFILES = 100
START_INDEX = 51  # Start after the original 50

# Demographics
ETHNICITIES = ["Black", "Latino", "White", "Mixed", "Asian", "Middle Eastern", "Other"]
POSITIONS = ["Top", "Bottom", "Versatile", "Versatile Top", "Versatile Bottom"]
BUILDS = ["Slim", "Athletic", "Muscular", "Average", "Large", "Stocky"]
HIV_STATUSES = ["Negative", "Positive", "Undetectable", "Ask Me"]
PRIVACY_MODES = ["OUT", "DOWNLO"]

# Social Expansion Fields
PRONOUNS = ["He/Him", "She/Her", "They/Them", "He/They", "Any Pronouns"]
GENDER_IDENTITIES = [
    "Cis-male",
    "Cis-female",
    "Trans-male",
    "Trans-female",
    "Non-binary",
    "Genderqueer",
]
RELATIONSHIP_STATUSES = [
    "Single",
    "In a Relationship",
    "Married",
    "Open Relationship",
    "Its Complicated",
    "Prefer Not to Say",
]
LOOKING_FOR_OPTIONS = [
    "Friendship",
    "Networking",
    "Dating",
    "Activity Partners",
    "Long-term Relationship",
    "Casual",
    "Not Sure Yet",
]
INDUSTRIES = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Entertainment",
    "Arts & Design",
    "Legal",
    "Marketing",
    "Hospitality",
    "Real Estate",
    "Nonprofit",
    "Government",
    "Retail",
    "Manufacturing",
]
EDUCATION_LEVELS = [
    "High School",
    "Some College",
    "Associates Degree",
    "Bachelors Degree",
    "Masters Degree",
    "Doctorate",
    "Trade School",
]
UNIVERSITIES = [
    "Temple University",
    "Drexel University",
    "Penn State",
    "Rutgers University",
    "Princeton University",
    "Rowan University",
    "Villanova University",
    "TCNJ",
    "Seton Hall",
    "Montclair State",
    "NJIT",
    "Stevens Institute",
]

# Targeted Localities: PHL + North/Central NJ with coordinates
CITY_COORDS = {
    "Philadelphia": {"lat": 39.9526, "lng": -75.1652, "state": "PA"},
    "King of Prussia": {"lat": 40.0884, "lng": -75.3910, "state": "PA"},
    "Norristown": {"lat": 40.1212, "lng": -75.3400, "state": "PA"},
    "Ardmore": {"lat": 40.0068, "lng": -75.2855, "state": "PA"},
    "Cherry Hill": {"lat": 39.9348, "lng": -75.0307, "state": "NJ"},
    "Camden": {"lat": 39.9259, "lng": -75.1196, "state": "NJ"},
    "Mount Laurel": {"lat": 39.9340, "lng": -74.8910, "state": "NJ"},
    "Pennsauken": {"lat": 39.9526, "lng": -75.0582, "state": "NJ"},
    "Newark": {"lat": 40.7357, "lng": -74.1724, "state": "NJ"},
    "Jersey City": {"lat": 40.7282, "lng": -74.0776, "state": "NJ"},
    "Hoboken": {"lat": 40.7440, "lng": -74.0324, "state": "NJ"},
    "Weehawken": {"lat": 40.7695, "lng": -74.0201, "state": "NJ"},
    "Paterson": {"lat": 40.9168, "lng": -74.1718, "state": "NJ"},
    "Clifton": {"lat": 40.8584, "lng": -74.1638, "state": "NJ"},
    "Montclair": {"lat": 40.8137, "lng": -74.2129, "state": "NJ"},
    "Hackensack": {"lat": 40.8859, "lng": -74.0435, "state": "NJ"},
    "Elizabeth": {"lat": 40.6640, "lng": -74.2107, "state": "NJ"},
    "Union": {"lat": 40.6976, "lng": -74.2632, "state": "NJ"},
    "Morristown": {"lat": 40.7968, "lng": -74.4815, "state": "NJ"},
    "New Brunswick": {"lat": 40.4862, "lng": -74.4518, "state": "NJ"},
    "Edison": {"lat": 40.5187, "lng": -74.4121, "state": "NJ"},
    "Woodbridge": {"lat": 40.5576, "lng": -74.2846, "state": "NJ"},
    "Old Bridge": {"lat": 40.4043, "lng": -74.3318, "state": "NJ"},
    "Princeton": {"lat": 40.3487, "lng": -74.6590, "state": "NJ"},
    "Trenton": {"lat": 40.2206, "lng": -74.7597, "state": "NJ"},
    "Hamilton": {"lat": 40.2237, "lng": -74.6982, "state": "NJ"},
    "Freehold": {"lat": 40.2601, "lng": -74.2738, "state": "NJ"},
}

LOCATIONS = list(CITY_COORDS.keys())

# Robust Persona Components
ARCHETYPES = [
    {
        "type": "The Career Professional",
        "taglines": [
            "Corporate by day, chill by night.",
            "Ambitious, driven, and looking for someone who keeps up.",
            "Building a life I don't need a vacation from.",
            "Success is only sweet when shared.",
        ],
        "intros": [
            "Just moved to the area for a new role in fintech. Loving the city vibes so far.",
            "I spend most of my week in meetings or at my desk, so I value my downtime.",
            "Philly native, working in healthcare administration. Dedicated to making a difference.",
            "Central NJ based. I commute to the city but love coming home to some peace and quiet.",
        ],
        "backgrounds": [
            "MBA holder with a passion for strategic planning and leadership.",
            "Working in the legal field, focusing on civil rights and community advocacy.",
            "Senior consultant for a global firm, frequently traveling but looking for a local connection.",
            "IT Director for a regional hospital system. I like things organized and efficient.",
        ],
        "interests": [
            "Networking",
            "Golf",
            "Wine Tasting",
            "Stocks",
            "Real Estate",
            "Fine Dining",
            "Opera",
        ],
    },
    {
        "type": "The Urban Creative",
        "taglines": [
            "Finding beauty in the concrete jungle.",
            "Art is not what I do, it's who I am.",
            "Good vibes, better music, and deep conversations.",
            "Looking for my next muse.",
        ],
        "intros": [
            "I live for the local art scene. You'll probably find me at a gallery opening in Fishtown.",
            "Musician and producer. My studio is my second home.",
            "Freelance photographer capturing the soul of Jersey City.",
            "Writer and poet. I see stories everywhere I look.",
        ],
        "backgrounds": [
            "Graduated from Tyler School of Art. Now running my own design studio.",
            "Grew up in Newark, inspired by the murals and the history of the city.",
            "Self-taught chef who views every plate as a canvas.",
            "Fashion designer focusing on sustainable and ethical urban wear.",
        ],
        "interests": [
            "Photography",
            "Live Music",
            "Street Art",
            "Indie Films",
            "Thrifting",
            "Vinyl Records",
            "Poetry",
        ],
    },
    {
        "type": "The Dedicated Athlete",
        "taglines": [
            "Stronger every single day.",
            "Gym is my sanctuary.",
            "Looking for a partner, not just a spectator.",
            "Pushing limits and breaking barriers.",
        ],
        "intros": [
            "If I'm not at work, I'm at the gym. Fitness is a lifestyle, not a hobby.",
            "Love a good morning run along the Schuylkill River Trail.",
            "Former D1 athlete still keeping that competitive edge alive.",
            "North NJ based. Catch me hiking the Palisades on my days off.",
        ],
        "backgrounds": [
            "Certified personal trainer and nutritionist helping others reach their goals.",
            "Physical therapist with a deep understanding of human performance.",
            "Amateur boxer training for my next match in the Philly circuit.",
            "Crossfit coach who believes in community and hard work.",
        ],
        "interests": [
            "Weightlifting",
            "Hiking",
            "Cycling",
            "Nutrition",
            "Sports",
            "Spartan Races",
            "Yoga",
        ],
    },
    {
        "type": "The Community Pillar",
        "taglines": [
            "Leaving the world better than I found it.",
            "Family, community, and connection.",
            "Grounded, honest, and ready for something real.",
            "A helping hand and an open heart.",
        ],
        "intros": [
            "Active in my local church and youth mentorship programs.",
            "Born and raised in Trenton. I'm all about giving back to my neighborhood.",
            "Educator by trade, community advocate by choice.",
            "I value tradition, loyalty, and a good Sunday dinner with family.",
        ],
        "backgrounds": [
            "High school teacher with 10 years of experience shaping young minds.",
            "Non-profit director focused on urban renewal and social justice.",
            "Social worker dedicated to supporting families in the Philly area.",
            "Small business owner who believes in the power of local economy.",
        ],
        "interests": [
            "Volunteering",
            "Cooking",
            "Gardening",
            "History",
            "Mentorship",
            "Book Club",
            "Local Politics",
        ],
    },
    {
        "type": "The Tech & Geek Culture",
        "taglines": [
            "Debugging life, one day at a time.",
            "In a world of ones and zeros, I'm looking for a ten.",
            "Logic is the beginning of wisdom.",
            "Gamers don't die, they respawn.",
        ],
        "intros": [
            "Full-stack dev who probably spends too much time on Reddit.",
            "Huge fan of sci-fi, fantasy, and everything in between.",
            "If we can talk about the MCU or Star Wars for hours, we'll get along.",
            "Living in Hoboken, working in tech, dreaming of Mars.",
        ],
        "backgrounds": [
            "Software engineer at a major tech hub in Princeton.",
            "Data scientist analyzing patterns and predicting the future.",
            "Cybersecurity expert keeping the digital world safe.",
            "Game developer creating immersive worlds from my home office.",
        ],
        "interests": [
            "Gaming",
            "Anime",
            "Coding",
            "Cosplay",
            "Tech Gadgets",
            "Board Games",
            "Astrophysics",
        ],
    },
]


# AI Generation Functions
async def generate_ai_persona(attributes):
    """Generates a unique persona using OpenAI GPT."""
    prompt = f"""
    Create a unique and realistic social media persona for a gay social platform.
    Attributes:
    - Name: {attributes['name']}
    - Location: {attributes['city']}, {attributes['state']}
    - Ethnicity: {attributes['ethnicity']}
    - Build: {attributes['build']}
    - Position: {attributes['position']}
    - Archetype: {attributes['archetype']}
    - Gender Identity: {attributes['gender_identity']}
    - Occupation: {attributes['occupation']}

    Return a JSON object with:
    1. "tagline": A catchy one-liner (max 50 chars).
    2. "intro": A 2-sentence introduction.
    3. "background": A brief background story.
    4. "about_me": A paragraph describing personality and lifestyle.
    5. "hobbies": A list of 5 specific hobbies.
    6. "lifestyle_image_prompts": A list of 5 descriptive prompts for DALL-E to generate lifestyle photos.
    7. "avatar_prompt": A descriptive prompt for a professional profile picture.
    """
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error generating persona: {e}")
        return None

async def generate_ai_image(prompt):
    """Generates an image using OpenAI DALL-E 3."""
    try:
        response = await client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        return response.data[0].url
    except Exception as e:
        print(f"Error generating image: {e}")
        return None

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
        f"urban_{first}",
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


from app.services.location import index_user_location


async def seed_expanded_profiles(num_to_seed=5):


    print(f"Seeding {num_to_seed} robust AI-enhanced test profiles for PHL/NJ areas...")





    async with SessionLocal() as db:


        hashed_pw = get_password_hash("password123")





        for i in range(num_to_seed):


            idx = START_INDEX + i





            # 1. Identity & Username


            name = fake.name_male()


            username = generate_username(name)


            email = f"{username.replace('_', '').replace('.', '')}{idx}@example.com"





            # 2. Archetype & Location Selection


            archetype_data = random.choice(ARCHETYPES)


            city = random.choice(LOCATIONS)


            coords = CITY_COORDS[city]


            state = coords["state"]


            lat = coords["lat"] + (random.random() - 0.5) * 0.01


            lng = coords["lng"] + (random.random() - 0.5) * 0.01





            # 3. Social Expansion Fields (Initial)


            gender_id = random.choice(GENDER_IDENTITIES)


            


            # Occupation based on archetype


            occupations_by_type = {


                "The Career Professional": ["Executive", "Manager", "Consultant", "Director", "Analyst"],


                "The Urban Creative": ["Designer", "Artist", "Musician", "Photographer", "Writer"],


                "The Dedicated Athlete": ["Personal Trainer", "Coach", "Physical Therapist", "Sports Manager"],


                "The Community Pillar": ["Teacher", "Social Worker", "Community Organizer", "Nonprofit Director"],


                "The Tech & Geek Culture": ["Software Engineer", "Data Scientist", "DevOps Engineer", "Product Manager"],


            }


            occupation = random.choice(occupations_by_type.get(archetype_data["type"], ["Professional"]))





            # 4. AI Persona Generation


            print(f"  Generating AI persona for {name}...")


            attributes = {


                "name": name,


                "city": city,


                "state": state,


                "ethnicity": random.choice(ETHNICITIES),


                "build": random.choice(BUILDS),


                "position": random.choice(POSITIONS),


                "archetype": archetype_data["type"],


                "gender_identity": gender_id,


                "occupation": occupation


            }


            


            persona = await generate_ai_persona(attributes)


            if not persona:


                print(f"  Skipping AI for {name} due to generation error.")


                # Fallback to legacy bio if AI fails


                bio_text = generate_bio(name, archetype_data)


                avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}&gender=male"


                lifestyle_images = []


            else:


                bio_text = (


                    f"**{persona['tagline']}**\n\n"


                    f"**Intro**: {persona['intro']}\n\n"


                    f"**Background**: {persona['background']}\n\n"


                    f"**About Me**: {persona['about_me']}\n\n"


                    f"**Interests**: {', '.join(persona['hobbies'])}"


                )


                


                # 5. AI Image Generation


                print(f"    Generating AI avatar...")


                avatar_url = await generate_ai_image(persona['avatar_prompt']) or f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}&gender=male"


                


                print(f"    Generating lifestyle images (5)...")


                lifestyle_images = []


                for j, prompt in enumerate(persona['lifestyle_image_prompts']):


                    img_url = await generate_ai_image(prompt)


                    if img_url:


                        lifestyle_images.append(img_url)


                    if len(lifestyle_images) >= 5: break





            # 6. User Creation


            user = User(


                email=email,


                name=name,


                hashed_password=hashed_pw,


                image=avatar_url,


                is_active=True,


                metadata_json={


                    "username": username, 


                    "archetype": archetype_data["type"],


                    "lifestyle_images": lifestyle_images,


                    "ai_generated": True if persona else False


                },


            )


            db.add(user)


            await db.flush()





                                    # 7. Full Robust Profile Creation





                                    display_name = name.split()[0] + " " + name.split()[1][0] + "."





                                    birthdate = fake.date_of_birth(minimum_age=21, maximum_age=55)





                                    looking_for = random.sample(LOOKING_FOR_OPTIONS, k=random.randint(1, 4))





                        





                                    # Social links (50% chance for each)





                                    social_links = {}





                                    if random.random() > 0.5:





                                        social_links["instagram_url"] = f"https://instagram.com/{username.replace('_', '')}"





                                    if random.random() > 0.5:





                                        social_links["x_url"] = f"https://x.com/{username.replace('_', '')}"





                                    if random.random() > 0.7:





                                        social_links["website_url"] = f"https://{username.replace('_', '')}.com"





                        





                                    # Privacy settings (random levels for some fields)





                                    privacy_settings = {}





                                    if random.random() > 0.7:





                                        privacy_settings["occupation"] = random.choice(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"])





                                    if random.random() > 0.7:





                                        privacy_settings["relationship_status"] = random.choice(["PUBLIC", "FRIENDS_ONLY"])





                        





                                    profile = Profile(





                                        id=user.id,





                                        bio=bio_text,





                                        height=f"{random.randint(5,6)}'{random.randint(0,11)}\"",





                                        weight=random.randint(140, 270),





                                        ethnicity=attributes["ethnicity"],





                                        position=attributes["position"],





                                        build=attributes["build"],





                                        hiv_status=random.choice(HIV_STATUSES),





                                        privacy_mode=random.choice(PRIVACY_MODES),





                                        location_city=city,





                                        location_state=state,





                                        location_lat=lat,





                                        location_lng=lng,





                                        is_trans_interested=random.choice([True, False]),





                                        created_at=fake.date_time_between(start_date="-1y", end_date="now"),





                                        display_name=display_name,





                                        pronouns=random.choice(PRONOUNS),





                                        birthdate=birthdate,





                                        gender_identity=gender_id,





                                        relationship_status=random.choice(RELATIONSHIP_STATUSES),





                                        looking_for=looking_for,





                                        occupation=occupation,





                                        industry=random.choice(INDUSTRIES),





                                        education_level=random.choice(EDUCATION_LEVELS) if random.random() > 0.3 else None,





                                        university=random.choice(UNIVERSITIES) if random.random() > 0.4 else None,





                                        social_links=social_links if social_links else None,





                                        privacy_settings=privacy_settings if privacy_settings else None,





                                    )





                                    db.add(profile)





                        





            





            # 8. Index in Redis


            await index_user_location(user.id, lat, lng)





            print(f"  Completed profile {i + 1}/{num_to_seed}: {username}")





        await db.commit()


    print("Robust AI profile seeding complete.")





if __name__ == "__main__":
    # Ensure we use the correct event loop policy for Windows if needed
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    # Set number of profiles to seed (defaulting to 5 for AI test)
    num_profiles = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    asyncio.run(seed_expanded_profiles(num_profiles))
