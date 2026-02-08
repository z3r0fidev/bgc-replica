"""Unit tests for BlockService."""
import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.block_service import BlockService, BLOCK_IDS_CACHE_TTL
from app.models.user import Relationship, User


@pytest.fixture
def block_service():
    """Create a fresh BlockService instance for each test."""
    return BlockService()


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def user_ids():
    """Generate test user IDs."""
    return {
        "blocker": uuid.uuid4(),
        "blocked": uuid.uuid4(),
        "third_user": uuid.uuid4(),
    }


class TestBlockUser:
    """Tests for block_user method."""

    @pytest.mark.asyncio
    async def test_block_user_success(self, block_service, mock_db, user_ids):
        """Test successfully blocking a user."""
        # Mock no existing block
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = mock_result

        # Mock Redis cache invalidation
        with patch.object(
            block_service, "_invalidate_block_cache", new_callable=AsyncMock
        ) as mock_invalidate:
            await block_service.block_user(
                mock_db, user_ids["blocker"], user_ids["blocked"]
            )

            # Verify add was called with a Relationship
            mock_db.add.assert_called_once()
            added_obj = mock_db.add.call_args[0][0]
            assert added_obj.from_user_id == user_ids["blocker"]
            assert added_obj.to_user_id == user_ids["blocked"]
            assert added_obj.type == "BLOCKED"
            assert added_obj.status == "ACCEPTED"

            # Verify commit and refresh were called
            mock_db.commit.assert_called()
            mock_db.refresh.assert_called()

            # Verify cache was invalidated for both users
            assert mock_invalidate.call_count == 2

    @pytest.mark.asyncio
    async def test_block_user_already_blocked(self, block_service, mock_db, user_ids):
        """Test blocking a user that's already blocked returns existing relationship."""
        existing_block = MagicMock(spec=Relationship)
        existing_block.id = uuid.uuid4()

        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = existing_block
        mock_db.execute.return_value = mock_result

        result = await block_service.block_user(
            mock_db, user_ids["blocker"], user_ids["blocked"]
        )

        assert result == existing_block
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_block_self_raises_error(self, block_service, mock_db):
        """Test that blocking yourself raises ValueError."""
        user_id = uuid.uuid4()

        with pytest.raises(ValueError, match="Cannot block yourself"):
            await block_service.block_user(mock_db, user_id, user_id)


class TestUnblockUser:
    """Tests for unblock_user method."""

    @pytest.mark.asyncio
    async def test_unblock_user_success(self, block_service, mock_db, user_ids):
        """Test successfully unblocking a user."""
        mock_result = MagicMock()
        mock_result.rowcount = 1
        mock_db.execute.return_value = mock_result

        with patch.object(
            block_service, "_invalidate_block_cache", new_callable=AsyncMock
        ) as mock_invalidate:
            result = await block_service.unblock_user(
                mock_db, user_ids["blocker"], user_ids["blocked"]
            )

            assert result is True
            mock_db.execute.assert_called_once()
            mock_db.commit.assert_called_once()
            assert mock_invalidate.call_count == 2

    @pytest.mark.asyncio
    async def test_unblock_user_not_blocked(self, block_service, mock_db, user_ids):
        """Test unblocking a user that wasn't blocked returns False."""
        mock_result = MagicMock()
        mock_result.rowcount = 0
        mock_db.execute.return_value = mock_result

        with patch.object(
            block_service, "_invalidate_block_cache", new_callable=AsyncMock
        ):
            result = await block_service.unblock_user(
                mock_db, user_ids["blocker"], user_ids["blocked"]
            )

            assert result is False


class TestGetBlockedUsers:
    """Tests for get_blocked_users method."""

    @pytest.mark.asyncio
    async def test_get_blocked_users_returns_list(self, block_service, mock_db, user_ids):
        """Test getting list of blocked users."""
        # Create mock user and relationship
        mock_user = MagicMock(spec=User)
        mock_user.id = user_ids["blocked"]
        mock_user.name = "Blocked User"
        mock_user.email = "blocked@example.com"
        mock_user.image = "https://example.com/image.jpg"

        mock_rel = MagicMock(spec=Relationship)
        mock_rel.id = uuid.uuid4()
        mock_rel.created_at = "2024-01-01T00:00:00"

        mock_result = MagicMock()
        mock_result.all.return_value = [(mock_rel, mock_user)]
        mock_db.execute.return_value = mock_result

        result = await block_service.get_blocked_users(mock_db, user_ids["blocker"])

        assert len(result) == 1
        assert result[0]["user"]["id"] == str(user_ids["blocked"])
        assert result[0]["user"]["name"] == "Blocked User"

    @pytest.mark.asyncio
    async def test_get_blocked_users_empty_list(self, block_service, mock_db, user_ids):
        """Test getting blocked users when none exist."""
        mock_result = MagicMock()
        mock_result.all.return_value = []
        mock_db.execute.return_value = mock_result

        result = await block_service.get_blocked_users(mock_db, user_ids["blocker"])

        assert result == []


class TestIsBlocked:
    """Tests for is_blocked method."""

    @pytest.mark.asyncio
    async def test_is_blocked_true(self, block_service, mock_db, user_ids):
        """Test is_blocked returns True when block exists."""
        mock_result = MagicMock()
        mock_result.first.return_value = (uuid.uuid4(),)  # Non-None result
        mock_db.execute.return_value = mock_result

        result = await block_service.is_blocked(
            mock_db, user_ids["blocker"], user_ids["blocked"]
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_is_blocked_false(self, block_service, mock_db, user_ids):
        """Test is_blocked returns False when no block exists."""
        mock_result = MagicMock()
        mock_result.first.return_value = None
        mock_db.execute.return_value = mock_result

        result = await block_service.is_blocked(
            mock_db, user_ids["blocker"], user_ids["blocked"]
        )

        assert result is False


class TestGetBlockStatus:
    """Tests for get_block_status method."""

    @pytest.mark.asyncio
    async def test_get_block_status_blocked_by_me(self, block_service, mock_db, user_ids):
        """Test block status when current user blocked the other."""
        with patch.object(block_service, "_get_block_relationship") as mock_get_rel:
            mock_get_rel.side_effect = [MagicMock(), None]  # blocked by me, not by them

            result = await block_service.get_block_status(
                mock_db, user_ids["blocker"], user_ids["blocked"]
            )

            assert result["is_blocked"] is True
            assert result["blocked_by_me"] is True
            assert result["blocked_by_them"] is False

    @pytest.mark.asyncio
    async def test_get_block_status_blocked_by_them(
        self, block_service, mock_db, user_ids
    ):
        """Test block status when other user blocked current user."""
        with patch.object(block_service, "_get_block_relationship") as mock_get_rel:
            mock_get_rel.side_effect = [None, MagicMock()]  # not by me, blocked by them

            result = await block_service.get_block_status(
                mock_db, user_ids["blocker"], user_ids["blocked"]
            )

            assert result["is_blocked"] is True
            assert result["blocked_by_me"] is False
            assert result["blocked_by_them"] is True

    @pytest.mark.asyncio
    async def test_get_block_status_mutual_block(self, block_service, mock_db, user_ids):
        """Test block status when both users blocked each other."""
        with patch.object(block_service, "_get_block_relationship") as mock_get_rel:
            mock_get_rel.side_effect = [MagicMock(), MagicMock()]  # both blocked

            result = await block_service.get_block_status(
                mock_db, user_ids["blocker"], user_ids["blocked"]
            )

            assert result["is_blocked"] is True
            assert result["blocked_by_me"] is True
            assert result["blocked_by_them"] is True

    @pytest.mark.asyncio
    async def test_get_block_status_no_blocks(self, block_service, mock_db, user_ids):
        """Test block status when neither user blocked the other."""
        with patch.object(block_service, "_get_block_relationship") as mock_get_rel:
            mock_get_rel.side_effect = [None, None]  # no blocks

            result = await block_service.get_block_status(
                mock_db, user_ids["blocker"], user_ids["blocked"]
            )

            assert result["is_blocked"] is False
            assert result["blocked_by_me"] is False
            assert result["blocked_by_them"] is False


class TestGetBlockIds:
    """Tests for get_block_ids method."""

    @pytest.mark.asyncio
    async def test_get_block_ids_from_cache(self, block_service, mock_db, user_ids):
        """Test getting block IDs from cache."""
        cached_ids = {user_ids["blocked"], user_ids["third_user"]}

        with patch.object(
            block_service, "_get_cached_block_ids", return_value=cached_ids
        ):
            result = await block_service.get_block_ids(mock_db, user_ids["blocker"])

            assert result == cached_ids
            mock_db.execute.assert_not_called()  # Should not hit DB

    @pytest.mark.asyncio
    async def test_get_block_ids_from_db(self, block_service, mock_db, user_ids):
        """Test getting block IDs from database when cache miss."""
        # Return None from cache
        with patch.object(block_service, "_get_cached_block_ids", return_value=None):
            # Mock database response with blocks in both directions
            mock_result = MagicMock()
            mock_result.all.return_value = [
                (user_ids["blocker"], user_ids["blocked"]),  # user blocked someone
                (user_ids["third_user"], user_ids["blocker"]),  # someone blocked user
            ]
            mock_db.execute.return_value = mock_result

            with patch.object(
                block_service, "_cache_block_ids", new_callable=AsyncMock
            ) as mock_cache:
                result = await block_service.get_block_ids(
                    mock_db, user_ids["blocker"]
                )

                # Should include both blocked user and user who blocked
                assert user_ids["blocked"] in result
                assert user_ids["third_user"] in result
                assert len(result) == 2

                # Verify caching was called
                mock_cache.assert_called_once()


class TestCacheOperations:
    """Tests for cache-related methods."""

    @pytest.mark.asyncio
    async def test_get_cached_block_ids_hit(self, block_service, user_ids):
        """Test cache hit returns correct data."""
        import json

        cached_data = json.dumps([str(user_ids["blocked"]), str(user_ids["third_user"])])

        mock_redis = AsyncMock()
        mock_redis.get.return_value = cached_data

        with patch(
            "app.services.block_service.get_redis", return_value=mock_redis
        ):
            result = await block_service._get_cached_block_ids(user_ids["blocker"])

            assert user_ids["blocked"] in result
            assert user_ids["third_user"] in result
            mock_redis.get.assert_called_once_with(f"blocks:{user_ids['blocker']}")

    @pytest.mark.asyncio
    async def test_get_cached_block_ids_miss(self, block_service, user_ids):
        """Test cache miss returns None."""
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None

        with patch(
            "app.services.block_service.get_redis", return_value=mock_redis
        ):
            result = await block_service._get_cached_block_ids(user_ids["blocker"])

            assert result is None

    @pytest.mark.asyncio
    async def test_get_cached_block_ids_redis_error(self, block_service, user_ids):
        """Test Redis error returns None gracefully."""
        with patch(
            "app.services.block_service.get_redis",
            side_effect=Exception("Redis connection error"),
        ):
            result = await block_service._get_cached_block_ids(user_ids["blocker"])

            assert result is None  # Should not raise, just return None

    @pytest.mark.asyncio
    async def test_cache_block_ids_success(self, block_service, user_ids):
        """Test caching block IDs."""
        block_ids = {user_ids["blocked"], user_ids["third_user"]}

        mock_redis = AsyncMock()

        with patch(
            "app.services.block_service.get_redis", return_value=mock_redis
        ):
            await block_service._cache_block_ids(user_ids["blocker"], block_ids)

            mock_redis.setex.assert_called_once()
            call_args = mock_redis.setex.call_args
            assert call_args[0][0] == f"blocks:{user_ids['blocker']}"
            assert call_args[0][1] == BLOCK_IDS_CACHE_TTL

    @pytest.mark.asyncio
    async def test_cache_block_ids_redis_error(self, block_service, user_ids):
        """Test caching gracefully handles Redis errors."""
        block_ids = {user_ids["blocked"]}

        with patch(
            "app.services.block_service.get_redis",
            side_effect=Exception("Redis connection error"),
        ):
            # Should not raise, just log warning
            await block_service._cache_block_ids(user_ids["blocker"], block_ids)

    @pytest.mark.asyncio
    async def test_invalidate_block_cache_success(self, block_service, user_ids):
        """Test invalidating cache for a user."""
        mock_redis = AsyncMock()

        with patch(
            "app.services.block_service.get_redis", return_value=mock_redis
        ):
            await block_service._invalidate_block_cache(user_ids["blocker"])

            mock_redis.delete.assert_called_once_with(f"blocks:{user_ids['blocker']}")

    @pytest.mark.asyncio
    async def test_invalidate_block_cache_redis_error(self, block_service, user_ids):
        """Test invalidation gracefully handles Redis errors."""
        with patch(
            "app.services.block_service.get_redis",
            side_effect=Exception("Redis connection error"),
        ):
            # Should not raise, just log warning
            await block_service._invalidate_block_cache(user_ids["blocker"])
