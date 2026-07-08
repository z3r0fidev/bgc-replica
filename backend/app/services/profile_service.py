import uuid
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from app.models.user import Relationship, Profile as ProfileModel
from app.schemas.user import UserBase
from app.schemas.profile import (
    Profile,
    ProfileCompletionResponse,
    CompletionTip,
    MilestoneStatus,
    FeatureUnlock,
)
from app.core.redis_config import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Field weighting definitions for profile completion
# Critical fields (40% total) - 5% each
CRITICAL_FIELDS = {
    "display_name": {"label": "Display Name", "tab": "identity", "weight": 5.0},
    "bio": {"label": "About Me", "tab": "basics", "weight": 5.0},
    "birthdate": {"label": "Birthday", "tab": "identity", "weight": 5.0},
    "location_city": {"label": "City", "tab": "basics", "weight": 5.0},
    "gender_identity": {"label": "Gender Identity", "tab": "identity", "weight": 5.0},
    "ethnicity": {"label": "Ethnicity", "tab": "basics", "weight": 5.0},
    "looking_for": {"label": "Looking For", "tab": "lifestyle", "weight": 5.0},
    # profile_photo handled separately when media system integrates
}

# Important fields (35% total) - 3.5% each
IMPORTANT_FIELDS = {
    "pronouns": {"label": "Pronouns", "tab": "identity", "weight": 3.5},
    "relationship_status": {"label": "Relationship Status", "tab": "lifestyle", "weight": 3.5},
    "body_type": {"label": "Body Type", "tab": "basics", "weight": 3.5},
    "height": {"label": "Height", "tab": "basics", "weight": 3.5},
    "location_state": {"label": "State", "tab": "basics", "weight": 3.5},
    "occupation": {"label": "Occupation", "tab": "professional", "weight": 3.5},
    "interests": {"label": "Interests", "tab": "lifestyle", "weight": 3.5},
    "roles": {"label": "Roles", "tab": "lifestyle", "weight": 3.5},
    "weight": {"label": "Weight", "tab": "basics", "weight": 3.5},
    "position": {"label": "Position", "tab": "lifestyle", "weight": 3.5},
}

# Nice-to-have fields (25% total) - ~2% each
NICE_TO_HAVE_FIELDS = {
    "industry": {"label": "Industry", "tab": "professional", "weight": 2.0},
    "education_level": {"label": "Education Level", "tab": "professional", "weight": 2.0},
    "university": {"label": "University", "tab": "professional", "weight": 2.0},
    "build": {"label": "Build", "tab": "basics", "weight": 2.0},
    "hiv_status": {"label": "HIV Status", "tab": "lifestyle", "weight": 2.0},
    "instagram_url": {"label": "Instagram", "tab": "social", "weight": 2.0},
    "x_url": {"label": "X (Twitter)", "tab": "social", "weight": 2.0},
    "tiktok_url": {"label": "TikTok", "tab": "social", "weight": 2.0},
    "website_url": {"label": "Website", "tab": "social", "weight": 2.0},
    "is_trans_interested": {"label": "Trans Interested", "tab": "lifestyle", "weight": 1.5},
    "privacy_settings": {"label": "Privacy Settings", "tab": "identity", "weight": 1.5},
}

# Milestones configuration
MILESTONES = [
    {"level": 1, "name": "Beginner", "threshold": 25, "badge_icon": "seedling"},
    {"level": 2, "name": "Explorer", "threshold": 50, "badge_icon": "compass"},
    {"level": 3, "name": "Socialite", "threshold": 75, "badge_icon": "star"},
    {"level": 4, "name": "Complete", "threshold": 95, "badge_icon": "trophy"},
]

# Feature unlocks
FEATURE_UNLOCKS = [
    {"threshold": 40, "name": "Search Visibility", "description": "Profile visible in search results"},
    {"threshold": 60, "name": "Priority Recommendations", "description": "Appear higher in recommendations"},
    {"threshold": 80, "name": "Verified Badge Eligible", "description": "Eligible for verified badge"},
]

# Base score (everyone starts at 20%)
BASE_SCORE = 20


class ProfileService:
    async def get_friendship_status(
        self, db: AsyncSession, user_id1: uuid.UUID, user_id2: uuid.UUID
    ) -> bool:
        """Checks if two users are friends (accepted relationship)."""
        if user_id1 == user_id2:
            return True

        # Try to get from cache first
        cached = await self._get_cached_friendship_status(user_id1, user_id2)
        if cached is not None:
            return cached

        stmt = select(Relationship).where(
            and_(
                or_(
                    and_(
                        Relationship.from_user_id == user_id1,
                        Relationship.to_user_id == user_id2,
                    ),
                    and_(
                        Relationship.from_user_id == user_id2,
                        Relationship.to_user_id == user_id1,
                    ),
                ),
                Relationship.type == "FRIEND",
                Relationship.status == "ACCEPTED",
            )
        )
        result = await db.execute(stmt)
        is_friend = result.scalars().first() is not None

        # Cache the result
        await self._cache_friendship_status(user_id1, user_id2, is_friend)

        return is_friend

    async def _get_friendship_cache_key(
        self, user_id1: uuid.UUID, user_id2: uuid.UUID
    ) -> str:
        """Generate a consistent cache key for friendship status (sorted to ensure consistency)."""
        ids = sorted([str(user_id1), str(user_id2)])
        return f"friendship:{ids[0]}:{ids[1]}"

    async def _get_cached_friendship_status(
        self, user_id1: uuid.UUID, user_id2: uuid.UUID
    ) -> Optional[bool]:
        """Get friendship status from cache."""
        try:
            redis = await get_redis()
            cache_key = await self._get_friendship_cache_key(user_id1, user_id2)
            cached_data = await redis.get(cache_key)
            if cached_data is not None:
                return json.loads(cached_data)
            return None
        except Exception as e:
            logger.warning(f"Failed to get friendship status from cache: {e}")
            return None

    async def _cache_friendship_status(
        self, user_id1: uuid.UUID, user_id2: uuid.UUID, is_friend: bool
    ) -> None:
        """Cache friendship status with TTL."""
        try:
            redis = await get_redis()
            cache_key = await self._get_friendship_cache_key(user_id1, user_id2)
            await redis.setex(
                cache_key, settings.FRIENDSHIP_CACHE_TTL, json.dumps(is_friend)
            )
        except Exception as e:
            logger.warning(f"Failed to cache friendship status: {e}")

    async def invalidate_friendship_cache(
        self, user_id1: uuid.UUID, user_id2: uuid.UUID
    ) -> None:
        """Invalidate friendship cache for a pair of users."""
        try:
            redis = await get_redis()
            cache_key = await self._get_friendship_cache_key(user_id1, user_id2)
            await redis.delete(cache_key)
        except Exception as e:
            logger.warning(f"Failed to invalidate friendship cache: {e}")

    async def get_profile_cached(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> Optional[Profile]:
        """
        Get a profile using cache-aside pattern.
        Returns Pydantic Profile schema for consistent API responses.
        """
        from app.services.cache import profile_cache

        async def fetch_from_db() -> Optional[Profile]:
            result = await db.execute(
                select(ProfileModel)
                .where(ProfileModel.id == user_id)
                .options(selectinload(ProfileModel.user))
            )
            profile_obj = result.scalars().first()
            if profile_obj:
                return Profile.model_validate(profile_obj)
            return None

        return await profile_cache.get_or_set(str(user_id), Profile, fetch_from_db)

    async def invalidate_profile_cache(self, user_id: uuid.UUID) -> None:
        """Invalidate cached profile for a user."""
        from app.services.cache import profile_cache

        await profile_cache.invalidate(str(user_id))
        logger.debug(f"Profile cache invalidated for user {user_id}")

    def apply_privacy_mask(
        self, profile_obj: Any, is_friend: bool, is_owner: bool
    ) -> Dict[str, Any]:
        """Applies privacy masking to a profile object based on privacy_settings."""
        # Convert to dict if it's a model or schema
        if hasattr(profile_obj, "model_dump"):
            profile_data = profile_obj.model_dump()
        else:
            profile_data = {
                "id": profile_obj.id,
                "bio": profile_obj.bio,
                "height": profile_obj.height,
                "weight": profile_obj.weight,
                "ethnicity": profile_obj.ethnicity,
                "body_type": profile_obj.body_type,
                "roles": profile_obj.roles,
                "interests": profile_obj.interests,
                "location_city": profile_obj.location_city,
                "location_state": profile_obj.location_state,
                "location_lat": profile_obj.location_lat,
                "location_lng": profile_obj.location_lng,
                "privacy_level": profile_obj.privacy_level,
                "position": profile_obj.position,
                "build": profile_obj.build,
                "hiv_status": profile_obj.hiv_status,
                "privacy_mode": profile_obj.privacy_mode,
                "is_trans_interested": profile_obj.is_trans_interested,
                "display_name": profile_obj.display_name,
                "pronouns": profile_obj.pronouns,
                "birthdate": profile_obj.birthdate,
                "gender_identity": profile_obj.gender_identity,
                "relationship_status": profile_obj.relationship_status,
                "looking_for": profile_obj.looking_for,
                "occupation": profile_obj.occupation,
                "industry": profile_obj.industry,
                "education_level": profile_obj.education_level,
                "university": profile_obj.university,
                "social_links": profile_obj.social_links,
                "privacy_settings": profile_obj.privacy_settings,
                "last_active": profile_obj.last_active,
                "user": (
                    UserBase.model_validate(profile_obj.user).model_dump()
                    if getattr(profile_obj, "user", None)
                    else None
                ),
            }

        if is_owner:
            return profile_data

        privacy_settings = profile_obj.privacy_settings or {}

        # Fields to potentially mask
        sensitive_fields = [
            "pronouns",
            "birthdate",
            "gender_identity",
            "relationship_status",
            "looking_for",
            "occupation",
            "industry",
            "education_level",
            "university",
            "social_links",
        ]

        for field in sensitive_fields:
            level = privacy_settings.get(field, "PUBLIC")

            if level == "PRIVATE":
                profile_data[field] = None
            elif level == "FRIENDS_ONLY" and not is_friend:
                profile_data[field] = None

        # Special handling for birthdate/age as per data-model.md
        # If privacy is "PARTIAL" (we can use a custom level or handle it specifically)
        # For now we use the standard levels.

        return profile_data

    def _is_field_filled(self, profile: Any, field: str) -> bool:
        """Check if a profile field is considered filled."""
        # Handle social links fields specially
        if field in ["instagram_url", "x_url", "tiktok_url", "website_url"]:
            social_links = getattr(profile, "social_links", None)
            if not social_links:
                return False
            value = social_links.get(field)
        elif field == "privacy_settings":
            privacy_settings = getattr(profile, "privacy_settings", None)
            # Consider filled if user has customized at least one setting
            return bool(privacy_settings and len(privacy_settings) > 0)
        else:
            value = getattr(profile, field, None)

        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, list):
            return len(value) > 0
        if isinstance(value, dict):
            return any(v for v in value.values() if v)
        if isinstance(value, bool):
            return True  # Boolean fields are always "filled"
        return bool(value)

    def _calculate_category_completion(
        self, profile: Any, fields: Dict[str, Dict]
    ) -> Tuple[int, int, float, List[CompletionTip]]:
        """
        Calculate completion for a category of fields.
        Returns: (filled_count, total_count, earned_percentage, missing_tips)
        """
        filled = 0
        total = len(fields)
        earned_pct = 0.0
        tips: List[CompletionTip] = []

        for field, config in fields.items():
            is_filled = self._is_field_filled(profile, field)
            if is_filled:
                filled += 1
                earned_pct += config["weight"]
            else:
                tips.append(
                    CompletionTip(
                        field=field,
                        label=config["label"],
                        category=self._get_category_name(fields),
                        tab=config["tab"],
                        weight=config["weight"],
                        quick_win=config["weight"] >= 3.5,  # Critical and important are quick wins
                    )
                )

        return filled, total, earned_pct, tips

    def _get_category_name(self, fields: Dict) -> str:
        """Get the category name based on field dict."""
        if fields is CRITICAL_FIELDS:
            return "critical"
        elif fields is IMPORTANT_FIELDS:
            return "important"
        return "nice_to_have"

    def _get_status_label(self, percentage: int) -> str:
        """Get human-readable status label."""
        if percentage >= 80:
            return "Robust"
        if percentage >= 50:
            return "Social"
        if percentage >= 25:
            return "Basic"
        return "Incomplete"

    def _get_milestones(self, percentage: int) -> Tuple[List[MilestoneStatus], str, Optional[str]]:
        """Get milestone statuses with current and next milestone."""
        milestones: List[MilestoneStatus] = []
        current_milestone = "None"
        next_milestone: Optional[str] = None

        for ms in MILESTONES:
            reached = percentage >= ms["threshold"]
            milestones.append(
                MilestoneStatus(
                    level=ms["level"],
                    name=ms["name"],
                    threshold=ms["threshold"],
                    reached=reached,
                    badge_icon=ms["badge_icon"],
                )
            )
            if reached:
                current_milestone = ms["name"]

        # Find next milestone
        for ms in MILESTONES:
            if percentage < ms["threshold"]:
                next_milestone = ms["name"]
                break

        return milestones, current_milestone, next_milestone

    def _get_feature_unlocks(self, percentage: int) -> List[FeatureUnlock]:
        """Get feature unlock statuses."""
        return [
            FeatureUnlock(
                threshold=fu["threshold"],
                name=fu["name"],
                description=fu["description"],
                unlocked=percentage >= fu["threshold"],
            )
            for fu in FEATURE_UNLOCKS
        ]

    async def calculate_completion(
        self, profile: Any
    ) -> ProfileCompletionResponse:
        """
        Calculate profile completion with weighted scoring.

        Scoring:
        - Base score: 20% (everyone starts here)
        - Critical fields (40%): 5% each
        - Important fields (35%): 3.5% each
        - Nice-to-have (25%): ~2% each

        Final score is inflated so users never see 0%.
        """
        # Calculate each category
        critical_filled, critical_total, critical_pct, critical_tips = (
            self._calculate_category_completion(profile, CRITICAL_FIELDS)
        )
        important_filled, important_total, important_pct, important_tips = (
            self._calculate_category_completion(profile, IMPORTANT_FIELDS)
        )
        nice_filled, nice_total, nice_pct, nice_tips = (
            self._calculate_category_completion(profile, NICE_TO_HAVE_FIELDS)
        )

        # Calculate raw percentage (actual field completion)
        raw_pct = critical_pct + important_pct + nice_pct

        # Apply base score inflation (20% base + up to 80% earned)
        inflated_pct = min(100, int(BASE_SCORE + (raw_pct * 0.8)))

        # Combine all tips and sort by weight (highest first for quick wins)
        all_tips = critical_tips + important_tips + nice_tips
        all_tips.sort(key=lambda t: (-t.weight, t.label))

        # Get top 5 suggestions
        suggestions = all_tips[:5]

        # Get milestones and status
        milestones, current_milestone, next_milestone = self._get_milestones(inflated_pct)
        status_label = self._get_status_label(inflated_pct)
        feature_unlocks = self._get_feature_unlocks(inflated_pct)

        return ProfileCompletionResponse(
            percentage=inflated_pct,
            raw_percentage=int(raw_pct),
            critical_filled=critical_filled,
            critical_total=critical_total,
            important_filled=important_filled,
            important_total=important_total,
            nice_to_have_filled=nice_filled,
            nice_to_have_total=nice_total,
            suggestions=suggestions,
            milestones=milestones,
            current_milestone=current_milestone,
            next_milestone=next_milestone,
            status_label=status_label,
            feature_unlocks=feature_unlocks,
        )

    async def get_completion_cached(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> ProfileCompletionResponse:
        """
        Get profile completion with Redis caching.
        Cache is invalidated when profile is updated.
        """
        cache_key = f"profile_completion:{user_id}"

        try:
            redis = await get_redis()
            cached_data = await redis.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                return ProfileCompletionResponse.model_validate(data)
        except Exception as e:
            logger.warning(f"Failed to get completion from cache: {e}")

        # Fetch profile and calculate
        result = await db.execute(
            select(ProfileModel)
            .where(ProfileModel.id == user_id)
            .options(selectinload(ProfileModel.user))
        )
        profile = result.scalars().first()

        if not profile:
            # Return default empty completion if no profile
            return ProfileCompletionResponse(
                percentage=BASE_SCORE,
                raw_percentage=0,
                critical_filled=0,
                critical_total=len(CRITICAL_FIELDS),
                important_filled=0,
                important_total=len(IMPORTANT_FIELDS),
                nice_to_have_filled=0,
                nice_to_have_total=len(NICE_TO_HAVE_FIELDS),
                suggestions=[],
                milestones=[
                    MilestoneStatus(
                        level=ms["level"],
                        name=ms["name"],
                        threshold=ms["threshold"],
                        reached=False,
                        badge_icon=ms["badge_icon"],
                    )
                    for ms in MILESTONES
                ],
                current_milestone="None",
                next_milestone="Beginner",
                status_label="Incomplete",
                feature_unlocks=self._get_feature_unlocks(BASE_SCORE),
            )

        completion = await self.calculate_completion(profile)

        # Cache the result
        try:
            redis = await get_redis()
            await redis.setex(
                cache_key,
                settings.PROFILE_CACHE_TTL,
                completion.model_dump_json(),
            )
        except Exception as e:
            logger.warning(f"Failed to cache completion: {e}")

        return completion

    async def invalidate_completion_cache(self, user_id: uuid.UUID) -> None:
        """Invalidate completion cache when profile is updated."""
        try:
            redis = await get_redis()
            await redis.delete(f"profile_completion:{user_id}")
            logger.debug(f"Completion cache invalidated for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to invalidate completion cache: {e}")


profile_service = ProfileService()
