"""
Recommendation Engine Service

AI-powered recommendation system that:
- Scrapes external social links for content signals
- Extracts interests using GPT-4o
- Tracks user interactions (ratings, favorites, threads, groups)
- Recommends threads and users based on keyword matching
"""

import asyncio
import json
import logging
import os
from typing import Optional

import httpx
import openai
from bs4 import BeautifulSoup
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User, Profile, ProfileRating, Relationship
from app.models.community import ForumThread, ForumPost, GroupMembership

logger = logging.getLogger(__name__)

# Initialize OpenAI client lazily
_openai_client: Optional[openai.AsyncOpenAI] = None


def get_openai_client() -> openai.AsyncOpenAI:
    """Get or create OpenAI client."""
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", None)
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured")
        _openai_client = openai.AsyncOpenAI(api_key=api_key)
    return _openai_client

class ContentScraper:
    """Scrapes external social media and websites for content signals."""
    
    async def fetch_page_content(self, url: str) -> dict:
        """Fetches page title, meta tags, and main text snippets."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Extract meta tags
            meta_data = {
                "og_title": self._get_meta(soup, "og:title"),
                "og_description": self._get_meta(soup, "og:description"),
                "keywords": self._get_meta(soup, "keywords", attr="name"),
            }
            
            # Extract main text snippets
            for script in soup(["script", "style"]):
                script.decompose()
            text = soup.get_text(separator=' ', strip=True)
            
            return {
                "url": url,
                "title": soup.title.string if soup.title else "",
                "meta": meta_data,
                "text_snippet": text[:2000]
            }
        except Exception as e:
            print(f"  Failed to scrape {url}: {e}")
            return None

    def _get_meta(self, soup, name, attr="property"):
        tag = soup.find("meta", attrs={attr: name})
        return tag["content"] if tag else None

    async def extract_interests_from_scraped(self, scraped_items: list) -> list:
        """Uses AI to extract key interest topics from multiple scraped sources."""
        if not scraped_items:
            return []
            
        context = []
        for item in scraped_items:
            context.append({
                "url": item['url'],
                "title": item['title'],
                "description": item['meta'].get('og_description'),
                "snippet": item['text_snippet'][:500]
            })
        
        prompt = f"""
        Analyze these scraped sources from a user's social media/links and identify 10 core interests.
        Content: {json.dumps(context)}
        Return ONLY a JSON object: {{"interests": ["Interest 1", ...]}}
        """
        
        try:
            client = get_openai_client()
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            data = json.loads(response.choices[0].message.content)
            return data.get("interests", [])
        except Exception as e:
            logger.warning(f"AI Interest Extraction failed: {e}")
            return []

class UserInteractionTracker:
    """Aggregates internal interaction data points."""
    
    @staticmethod
    async def get_user_signals(db, user_id: str) -> dict:
        signals = {"ratings": [], "favorites": [], "threads": [], "groups": []}
        
        # Ratings
        res = await db.execute(select(ProfileRating).where(ProfileRating.from_user_id == user_id))
        signals["ratings"] = [str(r.to_user_id) for r in res.scalars().all()]
        
        # Favorites
        res = await db.execute(select(Relationship).where(Relationship.from_user_id == user_id, Relationship.type == "FAVORITE"))
        signals["favorites"] = [str(r.to_user_id) for r in res.scalars().all()]
        
        # Posted Threads
        res = await db.execute(select(ForumPost.thread_id).where(ForumPost.author_id == user_id).distinct())
        signals["threads"] = [str(tid) for tid in res.scalars().all()]
        
        # Groups
        res = await db.execute(select(GroupMembership.group_id).where(GroupMembership.user_id == user_id))
        signals["groups"] = [str(gid) for gid in res.scalars().all()]
        
        return signals

class UserProfiler:
    """Builds a comprehensive interest profile for a user."""
    
    def __init__(self, db):
        self.db = db
        self.scraper = ContentScraper()
        self.tracker = UserInteractionTracker()

    async def build_interest_profile(self, user_id: str) -> dict:
        stmt = select(Profile).where(Profile.id == user_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()
        if not profile: return {}

        internal_signals = await self.tracker.get_user_signals(self.db, user_id)
        
        external_interests = []
        if profile.social_links:
            scrape_tasks = [self.scraper.fetch_page_content(url) for url in profile.social_links.values() if url and url.startswith("http")]
            scraped_results = await asyncio.gather(*scrape_tasks)
            valid_scraped = [r for r in scraped_results if r]
            if valid_scraped:
                external_interests = await self.scraper.extract_interests_from_scraped(valid_scraped)

        synthesis_prompt = f"""
        Synthesize these signals into 15 interest keywords.
        Internal: {json.dumps(profile.interests)}
        Looking For: {json.dumps(profile.looking_for)}
        Industry: {profile.industry}
        Groups: {json.dumps(internal_signals['groups'])}
        External: {json.dumps(external_interests)}
        Return JSON: {{"keywords": ["kw1", ...]}}
        """
        
        try:
            client = get_openai_client()
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": synthesis_prompt}],
                response_format={"type": "json_object"}
            )
            keywords = json.loads(response.choices[0].message.content).get("keywords", [])
        except Exception as e:
            logger.warning(f"Keyword synthesis failed: {e}")
            keywords = list(set((profile.interests.get('hobbies', []) if profile.interests else []) + external_interests))

        return {"user_id": str(user_id), "keywords": keywords}

class RecommendationEngine:
    def __init__(self, db_session):
        self.db = db_session
        self.profiler = UserProfiler(db_session)

    async def recommend_for_user(self, user_id: str, limit: int = 5):
        profile_data = await self.profiler.build_interest_profile(user_id)
        keywords = profile_data.get("keywords", [])
        
        # Thread Recommendations
        stmt = select(ForumThread).order_by(desc(ForumThread.last_activity)).limit(100)
        res = await self.db.execute(stmt)
        threads = res.scalars().all()
        scored_threads = sorted([(sum(1 for kw in keywords if kw.lower() in (t.title + " " + t.content).lower()), t) for t in threads], key=lambda x: x[0], reverse=True)

        # User Recommendations
        stmt = select(Profile).where(Profile.id != user_id).limit(100)
        res = await self.db.execute(stmt)
        other_profiles = res.scalars().all()
        scored_users = sorted([(sum(1 for kw in keywords if kw.lower() in (p.bio or "").lower()) + (2 if p.industry and any(kw.lower() in p.industry.lower() for kw in keywords) else 0), p) for p in other_profiles], key=lambda x: x[0], reverse=True)

        return {
            "threads": [t[1] for t in scored_threads[:limit] if t[0] > 0],
            "users": [u[1] for u in scored_users[:limit] if u[0] > 0],
            "keywords": keywords
        }

# Service factory function for API usage
async def get_recommendations(
    db: AsyncSession,
    user_id: str,
    limit: int = 5
) -> dict:
    """
    Get personalized recommendations for a user.

    Args:
        db: Database session
        user_id: UUID of the user
        limit: Maximum recommendations per category

    Returns:
        Dict with 'threads', 'users', and 'keywords' lists
    """
    engine = RecommendationEngine(db)
    return await engine.recommend_for_user(user_id, limit)


# CLI entry point for testing
async def _cli_main():
    """CLI utility for testing recommendations."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m app.services.recommendation_service <email_or_name>")
        return

    target = sys.argv[1]
    async with SessionLocal() as db:
        stmt = select(User).where(or_(User.email == target, User.name == target))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            print("User not found.")
            return

        recs = await get_recommendations(db, str(user.id))
        print(f"\nRecommendations for {user.name} ({', '.join(recs['keywords'][:5])}...)")
        print("\nThreads:")
        for t in recs['threads']:
            print(f"  - {t.title}")
        print("\nPeople:")
        for u in recs['users']:
            print(f"  - {u.display_name} ({u.occupation})")


if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(_cli_main())
    asyncio.run(main())