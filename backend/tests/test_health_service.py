"""Unit tests for HealthService."""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.health_service import HealthService


@pytest.fixture
def health_service():
    """Create a fresh HealthService instance for each test."""
    return HealthService()


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return AsyncMock(spec=AsyncSession)


class TestGetDatabaseStats:
    """Tests for get_database_stats method."""

    @pytest.mark.asyncio
    async def test_get_database_stats_success(self, health_service, mock_db):
        """Test successful database stats retrieval."""
        # Mock connection stats
        mock_conn_row = MagicMock()
        mock_conn_row.connections = 5
        mock_conn_row.max_connections = 100

        # Mock cache stats
        mock_cache_row = MagicMock()
        mock_cache_row.cache_hit_ratio = 99.5

        # Set up execute to return different results for different queries
        mock_conn_result = MagicMock()
        mock_conn_result.fetchone.return_value = mock_conn_row

        mock_cache_result = MagicMock()
        mock_cache_result.fetchone.return_value = mock_cache_row

        mock_db.execute.side_effect = [mock_conn_result, mock_cache_result]

        result = await health_service.get_database_stats(mock_db)

        assert result["status"] == "up"
        assert result["connections"] == 5
        assert result["max_connections"] == 100
        assert result["pool_size"] == 10
        assert result["cache_hit_ratio"] == 99.5

    @pytest.mark.asyncio
    async def test_get_database_stats_no_rows(self, health_service, mock_db):
        """Test database stats when queries return no rows."""
        mock_result = MagicMock()
        mock_result.fetchone.return_value = None
        mock_db.execute.return_value = mock_result

        result = await health_service.get_database_stats(mock_db)

        assert result["status"] == "up"
        assert result["connections"] == 0
        assert result["max_connections"] == 0
        assert result["cache_hit_ratio"] == 0

    @pytest.mark.asyncio
    async def test_get_database_stats_error(self, health_service, mock_db):
        """Test database stats when database error occurs."""
        mock_db.execute.side_effect = Exception("Database connection failed")

        result = await health_service.get_database_stats(mock_db)

        assert result["status"] == "down"
        assert result["connections"] == 0
        assert result["max_connections"] == 0
        assert result["pool_size"] == 0
        assert result["cache_hit_ratio"] == 0
        assert "error" in result
        assert "Database connection failed" in result["error"]


class TestGetRedisStats:
    """Tests for get_redis_stats method."""

    @pytest.mark.asyncio
    async def test_get_redis_stats_success(self, health_service):
        """Test successful Redis stats retrieval."""
        mock_redis = AsyncMock()
        mock_redis.info.return_value = {
            "used_memory_human": "128M",
            "instantaneous_ops_per_sec": 1500,
            "connected_clients": 10,
            "uptime_in_seconds": 86400,
        }

        with patch(
            "app.services.health_service.get_redis", return_value=mock_redis
        ):
            result = await health_service.get_redis_stats()

            assert result["status"] == "up"
            assert result["memory_used"] == "128M"
            assert result["ops_per_sec"] == 1500
            assert result["connected_clients"] == 10
            assert result["uptime_seconds"] == 86400

    @pytest.mark.asyncio
    async def test_get_redis_stats_minimal_info(self, health_service):
        """Test Redis stats with minimal info response."""
        mock_redis = AsyncMock()
        mock_redis.info.return_value = {}  # Empty info

        with patch(
            "app.services.health_service.get_redis", return_value=mock_redis
        ):
            result = await health_service.get_redis_stats()

            assert result["status"] == "up"
            assert result["memory_used"] == "0B"
            assert result["ops_per_sec"] == 0
            assert result["connected_clients"] == 0
            assert result["uptime_seconds"] == 0

    @pytest.mark.asyncio
    async def test_get_redis_stats_error(self, health_service):
        """Test Redis stats when Redis error occurs."""
        with patch(
            "app.services.health_service.get_redis",
            side_effect=Exception("Redis connection refused"),
        ):
            result = await health_service.get_redis_stats()

            assert result["status"] == "down"
            assert result["memory_used"] == "0B"
            assert result["ops_per_sec"] == 0
            assert result["connected_clients"] == 0
            assert result["uptime_seconds"] == 0
            assert "error" in result
            assert "Redis connection refused" in result["error"]


class TestGetErrorSummary:
    """Tests for get_error_summary method."""

    @pytest.mark.asyncio
    async def test_get_error_summary_success(self, health_service, mock_db):
        """Test successful error summary retrieval."""
        mock_row = MagicMock()
        mock_row.error_count = 15
        mock_row.total_count = 1000

        mock_result = MagicMock()
        mock_result.fetchone.return_value = mock_row
        mock_db.execute.return_value = mock_result

        result = await health_service.get_error_summary(mock_db, hours=24)

        assert result["error_count"] == 15
        assert result["total_events"] == 1000
        assert result["period_hours"] == 24

    @pytest.mark.asyncio
    async def test_get_error_summary_custom_hours(self, health_service, mock_db):
        """Test error summary with custom time period."""
        mock_row = MagicMock()
        mock_row.error_count = 5
        mock_row.total_count = 200

        mock_result = MagicMock()
        mock_result.fetchone.return_value = mock_row
        mock_db.execute.return_value = mock_result

        result = await health_service.get_error_summary(mock_db, hours=1)

        assert result["error_count"] == 5
        assert result["total_events"] == 200
        assert result["period_hours"] == 1

    @pytest.mark.asyncio
    async def test_get_error_summary_no_rows(self, health_service, mock_db):
        """Test error summary when no data exists."""
        mock_result = MagicMock()
        mock_result.fetchone.return_value = None
        mock_db.execute.return_value = mock_result

        result = await health_service.get_error_summary(mock_db)

        assert result["error_count"] == 0
        assert result["total_events"] == 0
        assert result["period_hours"] == 24

    @pytest.mark.asyncio
    async def test_get_error_summary_database_error(self, health_service, mock_db):
        """Test error summary when database error occurs."""
        mock_db.execute.side_effect = Exception("Query failed")

        result = await health_service.get_error_summary(mock_db)

        assert result["error_count"] == 0
        assert result["total_events"] == 0
        assert result["period_hours"] == 24
        assert "error" in result


class TestGetComprehensiveHealth:
    """Tests for get_comprehensive_health method."""

    @pytest.mark.asyncio
    async def test_comprehensive_health_all_healthy(self, health_service, mock_db):
        """Test comprehensive health when all systems are up."""
        with patch.object(
            health_service,
            "get_database_stats",
            return_value={
                "status": "up",
                "connections": 5,
                "max_connections": 100,
                "pool_size": 10,
                "cache_hit_ratio": 99.0,
            },
        ), patch.object(
            health_service,
            "get_redis_stats",
            return_value={
                "status": "up",
                "memory_used": "128M",
                "ops_per_sec": 1000,
                "connected_clients": 5,
                "uptime_seconds": 86400,
            },
        ), patch.object(
            health_service,
            "get_error_summary",
            return_value={
                "error_count": 0,
                "total_events": 500,
                "period_hours": 24,
            },
        ):
            result = await health_service.get_comprehensive_health(mock_db)

            assert result["status"] == "healthy"
            assert result["database"]["status"] == "up"
            assert result["redis"]["status"] == "up"
            assert result["error_count_24h"] == 0
            assert result["uptime_seconds"] == 86400
            assert "checked_at" in result

    @pytest.mark.asyncio
    async def test_comprehensive_health_database_down(self, health_service, mock_db):
        """Test comprehensive health when database is down."""
        with patch.object(
            health_service,
            "get_database_stats",
            return_value={
                "status": "down",
                "connections": 0,
                "max_connections": 0,
                "pool_size": 0,
                "cache_hit_ratio": 0,
                "error": "Connection refused",
            },
        ), patch.object(
            health_service,
            "get_redis_stats",
            return_value={
                "status": "up",
                "memory_used": "128M",
                "ops_per_sec": 1000,
                "connected_clients": 5,
                "uptime_seconds": 86400,
            },
        ), patch.object(
            health_service,
            "get_error_summary",
            return_value={
                "error_count": 10,
                "total_events": 500,
                "period_hours": 24,
            },
        ):
            result = await health_service.get_comprehensive_health(mock_db)

            assert result["status"] == "unhealthy"
            assert result["database"]["status"] == "down"

    @pytest.mark.asyncio
    async def test_comprehensive_health_redis_down(self, health_service, mock_db):
        """Test comprehensive health when Redis is down."""
        with patch.object(
            health_service,
            "get_database_stats",
            return_value={
                "status": "up",
                "connections": 5,
                "max_connections": 100,
                "pool_size": 10,
                "cache_hit_ratio": 99.0,
            },
        ), patch.object(
            health_service,
            "get_redis_stats",
            return_value={
                "status": "down",
                "memory_used": "0B",
                "ops_per_sec": 0,
                "connected_clients": 0,
                "uptime_seconds": 0,
                "error": "Redis unavailable",
            },
        ), patch.object(
            health_service,
            "get_error_summary",
            return_value={
                "error_count": 0,
                "total_events": 500,
                "period_hours": 24,
            },
        ):
            result = await health_service.get_comprehensive_health(mock_db)

            assert result["status"] == "unhealthy"
            assert result["redis"]["status"] == "down"

    @pytest.mark.asyncio
    async def test_comprehensive_health_degraded(self, health_service, mock_db):
        """Test comprehensive health when system is degraded (has errors but up)."""
        with patch.object(
            health_service,
            "get_database_stats",
            return_value={
                "status": "up",
                "connections": 5,
                "max_connections": 100,
                "pool_size": 10,
                "cache_hit_ratio": 99.0,
                "error": "Some recoverable error",  # Has error but status is up
            },
        ), patch.object(
            health_service,
            "get_redis_stats",
            return_value={
                "status": "up",
                "memory_used": "128M",
                "ops_per_sec": 1000,
                "connected_clients": 5,
                "uptime_seconds": 86400,
            },
        ), patch.object(
            health_service,
            "get_error_summary",
            return_value={
                "error_count": 50,
                "total_events": 500,
                "period_hours": 24,
            },
        ):
            result = await health_service.get_comprehensive_health(mock_db)

            assert result["status"] == "degraded"

    @pytest.mark.asyncio
    async def test_comprehensive_health_both_systems_down(
        self, health_service, mock_db
    ):
        """Test comprehensive health when both database and Redis are down."""
        with patch.object(
            health_service,
            "get_database_stats",
            return_value={
                "status": "down",
                "connections": 0,
                "max_connections": 0,
                "pool_size": 0,
                "cache_hit_ratio": 0,
                "error": "Database down",
            },
        ), patch.object(
            health_service,
            "get_redis_stats",
            return_value={
                "status": "down",
                "memory_used": "0B",
                "ops_per_sec": 0,
                "connected_clients": 0,
                "uptime_seconds": 0,
                "error": "Redis down",
            },
        ), patch.object(
            health_service,
            "get_error_summary",
            return_value={
                "error_count": 100,
                "total_events": 100,
                "period_hours": 24,
            },
        ):
            result = await health_service.get_comprehensive_health(mock_db)

            assert result["status"] == "unhealthy"
            assert result["database"]["status"] == "down"
            assert result["redis"]["status"] == "down"

    @pytest.mark.asyncio
    async def test_comprehensive_health_includes_timestamp(
        self, health_service, mock_db
    ):
        """Test that comprehensive health includes valid timestamp."""
        with patch.object(
            health_service,
            "get_database_stats",
            return_value={"status": "up", "connections": 1, "max_connections": 100,
                          "pool_size": 10, "cache_hit_ratio": 99.0},
        ), patch.object(
            health_service,
            "get_redis_stats",
            return_value={"status": "up", "memory_used": "64M", "ops_per_sec": 500,
                          "connected_clients": 2, "uptime_seconds": 3600},
        ), patch.object(
            health_service,
            "get_error_summary",
            return_value={"error_count": 0, "total_events": 100, "period_hours": 24},
        ):
            result = await health_service.get_comprehensive_health(mock_db)

            assert "checked_at" in result
            # Verify it's a valid ISO format timestamp
            checked_at = datetime.fromisoformat(result["checked_at"])
            assert isinstance(checked_at, datetime)


class TestHealthServiceIntegration:
    """Integration-style tests for HealthService."""

    @pytest.mark.asyncio
    async def test_health_service_singleton(self):
        """Test that health_service singleton exists."""
        from app.services.health_service import health_service

        assert isinstance(health_service, HealthService)

    @pytest.mark.asyncio
    async def test_default_error_summary_hours(self, health_service, mock_db):
        """Test that error summary defaults to 24 hours."""
        mock_row = MagicMock()
        mock_row.error_count = 0
        mock_row.total_count = 0

        mock_result = MagicMock()
        mock_result.fetchone.return_value = mock_row
        mock_db.execute.return_value = mock_result

        result = await health_service.get_error_summary(mock_db)

        assert result["period_hours"] == 24
