from typing import List, Set, Optional
import uuid
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, delete
from app.models.user import Relationship, User
from app.core.redis_config import get_redis

logger = logging.getLogger(__name__)

BLOCK_IDS_CACHE_TTL = 300  # 5 minutes


class BlockService:
    """Service for managing user blocks."""

    async def block_user(
        self, db: AsyncSession, blocker_id: uuid.UUID, blocked_id: uuid.UUID
    ) -> Relationship:
        """
        Block a user. Creates a BLOCKED relationship.
        Returns the created relationship.
        """
        if blocker_id == blocked_id:
            raise ValueError("Cannot block yourself")

        # Check if already blocked
        existing = await self._get_block_relationship(db, blocker_id, blocked_id)
        if existing:
            return existing

        new_block = Relationship(
            from_user_id=blocker_id,
            to_user_id=blocked_id,
            type="BLOCKED",
            status="ACCEPTED",
        )
        db.add(new_block)
        await db.commit()
        await db.refresh(new_block)

        # Invalidate cache for both users
        await self._invalidate_block_cache(blocker_id)
        await self._invalidate_block_cache(blocked_id)

        return new_block

    async def unblock_user(
        self, db: AsyncSession, blocker_id: uuid.UUID, blocked_id: uuid.UUID
    ) -> bool:
        """
        Unblock a user. Deletes the BLOCKED relationship.
        Returns True if a block was removed, False if no block existed.
        """
        result = await db.execute(
            delete(Relationship).where(
                and_(
                    Relationship.from_user_id == blocker_id,
                    Relationship.to_user_id == blocked_id,
                    Relationship.type == "BLOCKED",
                )
            )
        )
        await db.commit()

        # Invalidate cache for both users
        await self._invalidate_block_cache(blocker_id)
        await self._invalidate_block_cache(blocked_id)

        return result.rowcount > 0

    async def get_blocked_users(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> List[dict]:
        """
        Get list of users blocked by the current user.
        Returns list of blocked user info with block timestamp.
        """
        result = await db.execute(
            select(Relationship, User)
            .join(User, Relationship.to_user_id == User.id)
            .where(
                and_(
                    Relationship.from_user_id == user_id,
                    Relationship.type == "BLOCKED",
                )
            )
            .order_by(Relationship.created_at.desc())
        )
        rows = result.all()

        return [
            {
                "id": str(rel.id),
                "user": {
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "image": user.image,
                },
                "blocked_at": rel.created_at,
            }
            for rel, user in rows
        ]

    async def is_blocked(
        self, db: AsyncSession, user1_id: uuid.UUID, user2_id: uuid.UUID
    ) -> bool:
        """
        Check if there's a block relationship between two users in either direction.
        Returns True if either user has blocked the other.
        """
        result = await db.execute(
            select(Relationship.id).where(
                and_(
                    Relationship.type == "BLOCKED",
                    or_(
                        and_(
                            Relationship.from_user_id == user1_id,
                            Relationship.to_user_id == user2_id,
                        ),
                        and_(
                            Relationship.from_user_id == user2_id,
                            Relationship.to_user_id == user1_id,
                        ),
                    ),
                )
            )
        )
        return result.first() is not None

    async def get_block_status(
        self, db: AsyncSession, current_user_id: uuid.UUID, other_user_id: uuid.UUID
    ) -> dict:
        """
        Get detailed block status between two users.
        Returns dict with is_blocked, blocked_by_me, blocked_by_them.
        """
        blocked_by_me = await self._get_block_relationship(
            db, current_user_id, other_user_id
        )
        blocked_by_them = await self._get_block_relationship(
            db, other_user_id, current_user_id
        )

        return {
            "is_blocked": blocked_by_me is not None or blocked_by_them is not None,
            "blocked_by_me": blocked_by_me is not None,
            "blocked_by_them": blocked_by_them is not None,
        }

    async def get_block_ids(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> Set[uuid.UUID]:
        """
        Get all user IDs that should be filtered out for the given user.
        This includes users the current user has blocked AND users who blocked them.
        Used for efficient query filtering.
        """
        # Try to get from cache first
        cached = await self._get_cached_block_ids(user_id)
        if cached is not None:
            return cached

        result = await db.execute(
            select(Relationship.from_user_id, Relationship.to_user_id).where(
                and_(
                    Relationship.type == "BLOCKED",
                    or_(
                        Relationship.from_user_id == user_id,
                        Relationship.to_user_id == user_id,
                    ),
                )
            )
        )
        rows = result.all()

        block_ids = set()
        for from_id, to_id in rows:
            if from_id == user_id:
                block_ids.add(to_id)
            else:
                block_ids.add(from_id)

        # Cache the result
        await self._cache_block_ids(user_id, block_ids)

        return block_ids

    async def _get_cached_block_ids(
        self, user_id: uuid.UUID
    ) -> Optional[Set[uuid.UUID]]:
        """Get block IDs from cache."""
        try:
            redis = await get_redis()
            cache_key = f"blocks:{user_id}"
            cached_data = await redis.get(cache_key)
            if cached_data:
                id_list = json.loads(cached_data)
                return {uuid.UUID(id_str) for id_str in id_list}
            return None
        except Exception as e:
            logger.warning(f"Failed to get block IDs from cache: {e}")
            return None

    async def _cache_block_ids(
        self, user_id: uuid.UUID, block_ids: Set[uuid.UUID]
    ) -> None:
        """Cache block IDs with TTL."""
        try:
            redis = await get_redis()
            cache_key = f"blocks:{user_id}"
            id_list = [str(id) for id in block_ids]
            await redis.setex(cache_key, BLOCK_IDS_CACHE_TTL, json.dumps(id_list))
        except Exception as e:
            logger.warning(f"Failed to cache block IDs: {e}")

    async def _invalidate_block_cache(self, user_id: uuid.UUID) -> None:
        """Invalidate block cache for a user."""
        try:
            redis = await get_redis()
            cache_key = f"blocks:{user_id}"
            await redis.delete(cache_key)
        except Exception as e:
            logger.warning(f"Failed to invalidate block cache: {e}")

    async def _get_block_relationship(
        self, db: AsyncSession, from_user_id: uuid.UUID, to_user_id: uuid.UUID
    ) -> Optional[Relationship]:
        """Helper to get a specific block relationship."""
        result = await db.execute(
            select(Relationship).where(
                and_(
                    Relationship.from_user_id == from_user_id,
                    Relationship.to_user_id == to_user_id,
                    Relationship.type == "BLOCKED",
                )
            )
        )
        return result.scalars().first()


block_service = BlockService()
