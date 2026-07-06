import uuid
import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from app.models.user import Relationship, Profile as ProfileModel
from app.schemas.user import UserBase
from app.schemas.profile import Profile
from app.core.redis_config import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)


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


profile_service = ProfileService()
