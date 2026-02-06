"""Health service for system monitoring."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.redis_config import get_redis

logger = logging.getLogger(__name__)

# Cache key patterns for monitoring
CACHE_PATTERNS = {
    "blocks": "blocks:*",
    "friendship": "friendship:*",
    "sessions": "session:*",
    "rate_limits": "fastapi-limiter:*",
}


class HealthService:
    """Service for system health monitoring."""

    async def get_database_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Get database statistics."""
        try:
            # Check connection and get basic stats
            result = await db.execute(
                text("""
                    SELECT
                        (SELECT count(*) FROM pg_stat_activity
                         WHERE datname = current_database()) as connections,
                        (SELECT setting::int FROM pg_settings
                         WHERE name = 'max_connections') as max_connections
                """)
            )
            row = result.fetchone()

            # Get cache hit ratio
            cache_result = await db.execute(
                text("""
                    SELECT
                        CASE
                            WHEN (blks_hit + blks_read) > 0
                            THEN round(blks_hit::numeric / (blks_hit + blks_read) * 100, 2)
                            ELSE 100
                        END as cache_hit_ratio
                    FROM pg_stat_database
                    WHERE datname = current_database()
                """)
            )
            cache_row = cache_result.fetchone()

            return {
                "status": "up",
                "connections": row.connections if row else 0,
                "max_connections": row.max_connections if row else 0,
                "pool_size": 10,  # Default pool size
                "cache_hit_ratio": float(cache_row.cache_hit_ratio) if cache_row else 0,
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "down",
                "connections": 0,
                "max_connections": 0,
                "pool_size": 0,
                "cache_hit_ratio": 0,
                "error": str(e),
            }

    async def get_redis_stats(self) -> Dict[str, Any]:
        """Get Redis statistics."""
        try:
            redis = await get_redis()
            info = await redis.info()

            # Get memory info
            memory_used = info.get("used_memory_human", "0B")
            ops_per_sec = info.get("instantaneous_ops_per_sec", 0)
            connected_clients = info.get("connected_clients", 0)
            uptime_seconds = info.get("uptime_in_seconds", 0)

            return {
                "status": "up",
                "memory_used": memory_used,
                "ops_per_sec": ops_per_sec,
                "connected_clients": connected_clients,
                "uptime_seconds": uptime_seconds,
            }
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                "status": "down",
                "memory_used": "0B",
                "ops_per_sec": 0,
                "connected_clients": 0,
                "uptime_seconds": 0,
                "error": str(e),
            }

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get Redis cache hit/miss statistics and per-pattern key counts."""
        try:
            redis = await get_redis()
            info = await redis.info()

            # Get overall keyspace hit/miss ratio
            keyspace_hits = info.get("keyspace_hits", 0)
            keyspace_misses = info.get("keyspace_misses", 0)
            total_ops = keyspace_hits + keyspace_misses

            if total_ops > 0:
                overall_hit_ratio = round((keyspace_hits / total_ops) * 100, 2)
            else:
                overall_hit_ratio = 0.0

            # Count keys by pattern
            pattern_stats = {}
            for name, pattern in CACHE_PATTERNS.items():
                try:
                    # Use SCAN to count keys matching pattern (more efficient than KEYS)
                    count = 0
                    cursor = 0
                    while True:
                        cursor, keys = await redis.scan(cursor, match=pattern, count=100)
                        count += len(keys)
                        if cursor == 0:
                            break
                    pattern_stats[name] = {
                        "key_count": count,
                        "pattern": pattern,
                    }
                except Exception as e:
                    logger.warning(f"Failed to count keys for pattern {pattern}: {e}")
                    pattern_stats[name] = {
                        "key_count": 0,
                        "pattern": pattern,
                        "error": str(e),
                    }

            # Get memory stats
            used_memory = info.get("used_memory", 0)
            used_memory_peak = info.get("used_memory_peak", 0)
            maxmemory = info.get("maxmemory", 0)

            if maxmemory > 0:
                memory_usage_percent = round((used_memory / maxmemory) * 100, 2)
            else:
                memory_usage_percent = 0.0

            # Get eviction stats
            evicted_keys = info.get("evicted_keys", 0)
            expired_keys = info.get("expired_keys", 0)

            return {
                "status": "up",
                "overall_hit_ratio": overall_hit_ratio,
                "keyspace_hits": keyspace_hits,
                "keyspace_misses": keyspace_misses,
                "pattern_stats": pattern_stats,
                "memory": {
                    "used": info.get("used_memory_human", "0B"),
                    "peak": info.get("used_memory_peak_human", "0B"),
                    "usage_percent": memory_usage_percent,
                },
                "evictions": {
                    "evicted_keys": evicted_keys,
                    "expired_keys": expired_keys,
                },
                "targets": {
                    "blocks_hit_ratio": ">80%",
                    "friendship_hit_ratio": ">70%",
                    "overall_hit_ratio": ">75%",
                },
                "checked_at": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Cache stats check failed: {e}")
            return {
                "status": "down",
                "overall_hit_ratio": 0.0,
                "keyspace_hits": 0,
                "keyspace_misses": 0,
                "pattern_stats": {},
                "memory": {
                    "used": "0B",
                    "peak": "0B",
                    "usage_percent": 0.0,
                },
                "evictions": {
                    "evicted_keys": 0,
                    "expired_keys": 0,
                },
                "error": str(e),
            }

    async def get_error_summary(
        self, db: AsyncSession, hours: int = 24
    ) -> Dict[str, Any]:
        """Get error summary from auth logs (as a proxy for errors)."""
        try:
            since = datetime.utcnow() - timedelta(hours=hours)

            # Count failed auth attempts as a proxy for errors
            result = await db.execute(
                text("""
                    SELECT
                        COUNT(*) FILTER (WHERE success = false) as error_count,
                        COUNT(*) as total_count
                    FROM auth_logs
                    WHERE created_at >= :since
                """),
                {"since": since},
            )
            row = result.fetchone()

            return {
                "error_count": row.error_count if row else 0,
                "total_events": row.total_count if row else 0,
                "period_hours": hours,
            }
        except Exception as e:
            logger.error(f"Error summary check failed: {e}")
            return {
                "error_count": 0,
                "total_events": 0,
                "period_hours": hours,
                "error": str(e),
            }

    async def get_comprehensive_health(
        self, db: AsyncSession
    ) -> Dict[str, Any]:
        """Get comprehensive system health status."""
        database = await self.get_database_stats(db)
        redis = await self.get_redis_stats()
        errors = await self.get_error_summary(db)

        # Determine overall status
        if database["status"] == "down" or redis["status"] == "down":
            overall_status = "unhealthy"
        elif database.get("error") or redis.get("error"):
            overall_status = "degraded"
        else:
            overall_status = "healthy"

        return {
            "status": overall_status,
            "database": database,
            "redis": redis,
            "error_count_24h": errors["error_count"],
            "uptime_seconds": redis.get("uptime_seconds", 0),
            "checked_at": datetime.utcnow().isoformat(),
        }


health_service = HealthService()
