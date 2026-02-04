"""Analytics service for admin dashboard."""
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.user import User, Profile
from app.models.community import ForumPost, ForumThread, StatusUpdate, PostComment


class AnalyticsService:
    """Service for generating analytics and metrics."""

    async def get_user_growth(
        self, db: AsyncSession, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get daily user registration counts for the past N days."""
        start_date = datetime.utcnow() - timedelta(days=days)

        result = await db.execute(
            select(
                func.date(User.created_at).label("date"),
                func.count(User.id).label("count"),
            )
            .where(User.created_at >= start_date)
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at))
        )

        rows = result.all()
        return [{"date": str(row.date), "count": row.count} for row in rows]

    async def get_active_users(
        self, db: AsyncSession
    ) -> Dict[str, int]:
        """Get DAU, WAU, MAU counts based on last_login_at."""
        now = datetime.utcnow()
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Daily Active Users
        dau_result = await db.execute(
            select(func.count(User.id)).where(
                and_(User.last_login_at >= day_ago, User.is_active == True)
            )
        )
        dau = dau_result.scalar() or 0

        # Weekly Active Users
        wau_result = await db.execute(
            select(func.count(User.id)).where(
                and_(User.last_login_at >= week_ago, User.is_active == True)
            )
        )
        wau = wau_result.scalar() or 0

        # Monthly Active Users
        mau_result = await db.execute(
            select(func.count(User.id)).where(
                and_(User.last_login_at >= month_ago, User.is_active == True)
            )
        )
        mau = mau_result.scalar() or 0

        return {"dau": dau, "wau": wau, "mau": mau}

    async def get_engagement_metrics(
        self, db: AsyncSession, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get daily engagement metrics (posts, comments) for the past N days."""
        start_date = datetime.utcnow() - timedelta(days=days)

        # Get feed posts by day
        posts_result = await db.execute(
            select(
                func.date(StatusUpdate.created_at).label("date"),
                func.count(StatusUpdate.id).label("count"),
            )
            .where(StatusUpdate.created_at >= start_date)
            .group_by(func.date(StatusUpdate.created_at))
            .order_by(func.date(StatusUpdate.created_at))
        )
        posts_by_date = {str(row.date): row.count for row in posts_result.all()}

        # Get feed comments by day
        comments_result = await db.execute(
            select(
                func.date(PostComment.created_at).label("date"),
                func.count(PostComment.id).label("count"),
            )
            .where(PostComment.created_at >= start_date)
            .group_by(func.date(PostComment.created_at))
            .order_by(func.date(PostComment.created_at))
        )
        comments_by_date = {str(row.date): row.count for row in comments_result.all()}

        # Combine into daily metrics
        all_dates = set(posts_by_date.keys()) | set(comments_by_date.keys())
        metrics = []
        for date in sorted(all_dates):
            metrics.append({
                "date": date,
                "posts": posts_by_date.get(date, 0),
                "comments": comments_by_date.get(date, 0),
            })

        return metrics

    async def get_content_stats(self, db: AsyncSession) -> Dict[str, int]:
        """Get total counts for various content types."""
        # Total feed posts
        posts_result = await db.execute(select(func.count(StatusUpdate.id)))
        total_posts = posts_result.scalar() or 0

        # Total feed comments
        comments_result = await db.execute(select(func.count(PostComment.id)))
        total_comments = comments_result.scalar() or 0

        # Total forum threads
        threads_result = await db.execute(select(func.count(ForumThread.id)))
        total_threads = threads_result.scalar() or 0

        # Total forum posts
        forum_posts_result = await db.execute(select(func.count(ForumPost.id)))
        total_forum_posts = forum_posts_result.scalar() or 0

        # Total verified profiles
        verified_result = await db.execute(
            select(func.count(Profile.id)).where(Profile.is_verified == True)
        )
        verified_profiles = verified_result.scalar() or 0

        return {
            "total_posts": total_posts,
            "total_comments": total_comments,
            "total_threads": total_threads,
            "total_forum_posts": total_forum_posts,
            "verified_profiles": verified_profiles,
        }

    async def get_analytics_overview(
        self, db: AsyncSession, days: int = 30
    ) -> Dict[str, Any]:
        """Get complete analytics overview."""
        user_growth = await self.get_user_growth(db, days)
        active_users = await self.get_active_users(db)
        engagement = await self.get_engagement_metrics(db, days)
        content_stats = await self.get_content_stats(db)

        return {
            "user_growth": user_growth,
            "engagement": engagement,
            "dau": active_users["dau"],
            "wau": active_users["wau"],
            "mau": active_users["mau"],
            **content_stats,
        }


analytics_service = AnalyticsService()
