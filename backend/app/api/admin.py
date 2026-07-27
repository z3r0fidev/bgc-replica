"""Admin API endpoints for user management and moderation."""
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Duration, Limiter, Rate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc
from app.core.config import settings
from app.core.database import get_db
from app.core.validation import validate_query_params
from app.api import deps
from app.models.user import User, Profile, AdminActionLog
from app.models.moderation import Warning
from app.schemas.admin import (
    AdminUserListItem,
    AdminUserDetail,
    AdminUserListResponse,
    SuspendUserRequest,
    BanUserRequest,
    AdminActionLogItem,
    AdminActionLogResponse,
    AdminStatsOverview,
    UpdateUserRequest,
    IssueWarningRequest,
    RevokeWarningRequest,
    WarningItem,
    WarningListResponse,
    IssueWarningResponse,
)
from app.services.warning_service import warning_service

router = APIRouter()


def escape_like(value: str) -> str:
    """Escape SQL LIKE wildcard characters to prevent injection."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# Helper function to log admin actions
async def log_admin_action(
    db: AsyncSession,
    admin_id: uuid.UUID,
    target_user_id: Optional[uuid.UUID],
    action: str,
    reason: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> AdminActionLog:
    """Log an admin action."""
    log = AdminActionLog(
        admin_id=admin_id,
        target_user_id=target_user_id,
        action=action,
        reason=reason,
        action_metadata=metadata,
    )
    db.add(log)
    await db.commit()
    return log


@router.get(
    "/stats",
    response_model=AdminStatsOverview,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(60, Duration.MINUTE))))],
)
async def get_admin_stats(
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get overview statistics for admin dashboard."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    # Total users
    total_result = await db.execute(select(func.count(User.id)))
    total_users = total_result.scalar() or 0

    # Active users (not banned, not suspended)
    active_result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.is_active.is_(True),
                User.banned_at.is_(None),
                or_(User.suspended_until.is_(None), User.suspended_until < now),
            )
        )
    )
    active_users = active_result.scalar() or 0

    # Suspended users
    suspended_result = await db.execute(
        select(func.count(User.id)).where(
            and_(User.suspended_at.isnot(None), User.suspended_until > now)
        )
    )
    suspended_users = suspended_result.scalar() or 0

    # Banned users
    banned_result = await db.execute(
        select(func.count(User.id)).where(User.banned_at.isnot(None))
    )
    banned_users = banned_result.scalar() or 0

    # Admin users
    admin_result = await db.execute(
        select(func.count(User.id)).where(User.is_superuser.is_(True))
    )
    admin_users = admin_result.scalar() or 0

    # New users today
    today_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )
    new_users_today = today_result.scalar() or 0

    # New users this week
    week_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_start)
    )
    new_users_this_week = week_result.scalar() or 0

    # New users this month
    month_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= month_start)
    )
    new_users_this_month = month_result.scalar() or 0

    return AdminStatsOverview(
        total_users=total_users,
        active_users=active_users,
        suspended_users=suspended_users,
        banned_users=banned_users,
        admin_users=admin_users,
        new_users_today=new_users_today,
        new_users_this_week=new_users_this_week,
        new_users_this_month=new_users_this_month,
    )


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(30, Duration.MINUTE))))],
)
async def list_users(
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    query: Optional[str] = Query(None, description="Search by name or email"),
    is_active: Optional[bool] = Query(None),
    is_superuser: Optional[bool] = Query(None),
    is_suspended: Optional[bool] = Query(None),
    is_banned: Optional[bool] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0, le=10000),
):
    """List users with search and filtering."""
    validate_query_params(query=query, sort_by=sort_by, sort_order=sort_order)
    now = datetime.utcnow()

    # Build base query
    stmt = select(User)
    count_stmt = select(func.count(User.id))

    # Apply filters
    filters = []

    if query:
        escaped_query = escape_like(query)
        search_term = f"%{escaped_query}%"
        filters.append(
            or_(
                User.name.ilike(search_term, escape="\\"),
                User.email.ilike(search_term, escape="\\"),
            )
        )

    if is_active is not None:
        filters.append(User.is_active == is_active)

    if is_superuser is not None:
        filters.append(User.is_superuser == is_superuser)

    if is_suspended is not None:
        if is_suspended:
            filters.append(
                and_(User.suspended_at.isnot(None), User.suspended_until > now)
            )
        else:
            filters.append(
                or_(User.suspended_at.is_(None), User.suspended_until <= now)
            )

    if is_banned is not None:
        if is_banned:
            filters.append(User.banned_at.isnot(None))
        else:
            filters.append(User.banned_at.is_(None))

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    # Get total count
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(User, sort_by, User.created_at)
    if sort_order == "asc":
        stmt = stmt.order_by(asc(sort_column))
    else:
        stmt = stmt.order_by(desc(sort_column))

    # Apply pagination
    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    users = result.scalars().all()

    return AdminUserListResponse(
        items=[AdminUserListItem.model_validate(u) for u in users],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def get_user(
    user_id: uuid.UUID,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get detailed user information."""
    result = await db.execute(
        select(User).options().where(User.id == user_id)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get profile info if available
    profile_result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = profile_result.scalars().first()

    user_data = AdminUserDetail.model_validate(user)
    if profile:
        user_data.profile_display_name = profile.display_name
        user_data.profile_location_city = profile.location_city
        user_data.profile_location_state = profile.location_state
        user_data.profile_is_verified = profile.is_verified

    return user_data


@router.patch("/users/{user_id}", response_model=AdminUserDetail)
async def update_user(
    user_id: uuid.UUID,
    update_data: UpdateUserRequest,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update user fields."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent modifying yourself for certain fields
    if user_id == admin.id:
        if update_data.is_superuser is False:
            raise HTTPException(
                status_code=400, detail="Cannot remove your own admin status"
            )

    # Track changes for logging
    changes: dict[str, Any] = {}

    if update_data.name is not None and user.name != update_data.name:
        changes["name"] = {"from": user.name, "to": update_data.name}
        user.name = update_data.name

    if update_data.is_active is not None and user.is_active != update_data.is_active:
        changes["is_active"] = {"from": user.is_active, "to": update_data.is_active}
        user.is_active = update_data.is_active

    if (
        update_data.is_superuser is not None
        and user.is_superuser != update_data.is_superuser
    ):
        changes["is_superuser"] = {
            "from": user.is_superuser,
            "to": update_data.is_superuser,
        }
        user.is_superuser = update_data.is_superuser

    if changes:
        await db.commit()
        await db.refresh(user)
        await log_admin_action(
            db, admin.id, user_id, "UPDATE_USER", metadata={"changes": changes}
        )

    return AdminUserDetail.model_validate(user)


@router.post(
    "/users/{user_id}/suspend",
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(10, Duration.MINUTE))))],
)
async def suspend_user(
    user_id: uuid.UUID,
    request: SuspendUserRequest,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Suspend a user temporarily."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.banned_at:
        raise HTTPException(status_code=400, detail="User is already banned")

    now = datetime.utcnow()
    user.suspended_at = now
    user.suspension_reason = request.reason

    if request.duration_hours:
        user.suspended_until = now + timedelta(hours=request.duration_hours)
    else:
        # Indefinite suspension (until manually lifted)
        user.suspended_until = now + timedelta(days=365 * 100)  # 100 years

    await db.commit()

    await log_admin_action(
        db,
        admin.id,
        user_id,
        "SUSPEND_USER",
        reason=request.reason,
        metadata={"duration_hours": request.duration_hours},
    )

    return {
        "message": "User suspended",
        "suspended_until": user.suspended_until.isoformat(),
    }


@router.post(
    "/users/{user_id}/ban",
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(10, Duration.MINUTE))))],
)
async def ban_user(
    user_id: uuid.UUID,
    request: BanUserRequest,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Permanently ban a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_superuser:
        raise HTTPException(
            status_code=400, detail="Cannot ban another admin. Revoke admin first."
        )

    user.banned_at = datetime.utcnow()
    user.ban_reason = request.reason
    user.is_active = False

    # Clear any existing suspension
    user.suspended_at = None
    user.suspended_until = None
    user.suspension_reason = None

    await db.commit()

    await log_admin_action(db, admin.id, user_id, "BAN_USER", reason=request.reason)

    return {"message": "User banned"}


@router.post(
    "/users/{user_id}/restore",
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(10, Duration.MINUTE))))],
)
async def restore_user(
    user_id: uuid.UUID,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Restore a suspended or banned user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    was_banned = user.banned_at is not None
    was_suspended = user.suspended_at is not None

    if not was_banned and not was_suspended:
        raise HTTPException(
            status_code=400, detail="User is not suspended or banned"
        )

    user.suspended_at = None
    user.suspended_until = None
    user.suspension_reason = None
    user.banned_at = None
    user.ban_reason = None
    user.is_active = True

    await db.commit()

    action = "RESTORE_FROM_BAN" if was_banned else "RESTORE_FROM_SUSPENSION"
    await log_admin_action(db, admin.id, user_id, action)

    return {"message": "User restored"}


@router.post(
    "/users/{user_id}/warnings",
    response_model=IssueWarningResponse,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(10, Duration.MINUTE))))],
)
async def issue_warning(
    user_id: uuid.UUID,
    request: IssueWarningRequest,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Issue a moderation warning directly to a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot warn yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    warning, escalated = await warning_service.issue_warning(
        db,
        user_id=user_id,
        admin_id=admin.id,
        reason=request.reason,
        severity=request.severity,
        notify=request.notify,
    )

    active_count_result = await db.execute(
        select(func.count(Warning.id)).where(
            Warning.user_id == user_id, Warning.status == "ACTIVE"
        )
    )
    active_count = active_count_result.scalar_one()

    return IssueWarningResponse(
        warning=WarningItem(
            id=warning.id,
            user_id=warning.user_id,
            admin_id=warning.admin_id,
            admin_name=admin.name,
            report_id=warning.report_id,
            reason=warning.reason,
            severity=warning.severity,
            status=warning.status,
            triggered_escalation=warning.triggered_escalation,
            created_at=warning.created_at,
        ),
        escalated=escalated,
        active_count=active_count,
    )


@router.get(
    "/users/{user_id}/warnings",
    response_model=WarningListResponse,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(60, Duration.MINUTE))))],
)
async def get_user_warnings(
    user_id: uuid.UUID,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Get paginated warning history for a user."""
    validate_query_params(status=status)
    stmt = select(Warning).where(Warning.user_id == user_id)
    count_stmt = select(func.count(Warning.id)).where(Warning.user_id == user_id)
    active_count_stmt = select(func.count(Warning.id)).where(
        Warning.user_id == user_id, Warning.status == "ACTIVE"
    )

    if status:
        stmt = stmt.where(Warning.status == status)
        count_stmt = count_stmt.where(Warning.status == status)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    active_count_result = await db.execute(active_count_stmt)
    active_count = active_count_result.scalar() or 0

    stmt = stmt.order_by(desc(Warning.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    warnings = result.scalars().all()

    admin_ids = {w.admin_id for w in warnings if w.admin_id}
    admin_names = {}
    if admin_ids:
        names_result = await db.execute(
            select(User.id, User.name).where(User.id.in_(admin_ids))
        )
        for uid, name in names_result.all():
            admin_names[uid] = name

    items = [
        WarningItem(
            id=w.id,
            user_id=w.user_id,
            admin_id=w.admin_id,
            admin_name=admin_names.get(w.admin_id) if w.admin_id else None,
            report_id=w.report_id,
            reason=w.reason,
            severity=w.severity,
            status=w.status,
            triggered_escalation=w.triggered_escalation,
            created_at=w.created_at,
        )
        for w in warnings
    ]

    return WarningListResponse(
        items=items,
        total=total,
        active_count=active_count,
        threshold=settings.WARNING_ESCALATION_THRESHOLD,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/users/{user_id}/warnings/{warning_id}/revoke",
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(10, Duration.MINUTE))))],
)
async def revoke_warning(
    user_id: uuid.UUID,
    warning_id: uuid.UUID,
    request: RevokeWarningRequest,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Revoke a previously issued warning. Does not lift an already-triggered suspension."""
    result = await db.execute(
        select(Warning).where(Warning.id == warning_id, Warning.user_id == user_id)
    )
    warning = result.scalars().first()
    if not warning:
        raise HTTPException(status_code=404, detail="Warning not found")

    if warning.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Warning is not active")

    warning.status = "REVOKED"
    await db.commit()

    await log_admin_action(
        db, admin.id, user_id, "REVOKE_WARNING", reason=request.reason,
        metadata={"warning_id": str(warning_id)},
    )

    return {"message": "Warning revoked"}


@router.post(
    "/users/{user_id}/make-admin",
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(5, Duration.MINUTE))))],
)
async def make_admin(
    user_id: uuid.UUID,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Grant admin privileges to a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_superuser:
        raise HTTPException(status_code=400, detail="User is already an admin")

    if user.banned_at:
        raise HTTPException(status_code=400, detail="Cannot make a banned user admin")

    user.is_superuser = True
    await db.commit()

    await log_admin_action(db, admin.id, user_id, "GRANT_ADMIN")

    return {"message": "Admin privileges granted"}


@router.post(
    "/users/{user_id}/revoke-admin",
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(5, Duration.MINUTE))))],
)
async def revoke_admin(
    user_id: uuid.UUID,
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Revoke admin privileges from a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot revoke your own admin status")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_superuser:
        raise HTTPException(status_code=400, detail="User is not an admin")

    user.is_superuser = False
    await db.commit()

    await log_admin_action(db, admin.id, user_id, "REVOKE_ADMIN")

    return {"message": "Admin privileges revoked"}


@router.get("/action-logs", response_model=AdminActionLogResponse)
async def get_action_logs(
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    action: Optional[str] = Query(None, description="Filter by action type"),
    admin_id: Optional[uuid.UUID] = Query(None, description="Filter by admin"),
    target_user_id: Optional[uuid.UUID] = Query(None, description="Filter by target"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0, le=10000),
):
    """Get admin action logs with filtering."""
    validate_query_params(action=action)
    stmt = select(AdminActionLog)
    count_stmt = select(func.count(AdminActionLog.id))

    filters = []
    if action:
        filters.append(AdminActionLog.action == action)
    if admin_id:
        filters.append(AdminActionLog.admin_id == admin_id)
    if target_user_id:
        filters.append(AdminActionLog.target_user_id == target_user_id)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    # Get total
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Get logs with admin/target names
    stmt = stmt.order_by(desc(AdminActionLog.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    logs = result.scalars().all()

    # Fetch user names for display
    user_ids = set()
    for log in logs:
        if log.admin_id:
            user_ids.add(log.admin_id)
        if log.target_user_id:
            user_ids.add(log.target_user_id)

    user_names = {}
    if user_ids:
        users_result = await db.execute(
            select(User.id, User.name).where(User.id.in_(user_ids))
        )
        for uid, name in users_result.all():
            user_names[uid] = name

    items = []
    for log in logs:
        items.append(
            AdminActionLogItem(
                id=log.id,
                admin_id=log.admin_id,
                admin_name=user_names.get(log.admin_id) if log.admin_id else None,
                target_user_id=log.target_user_id,
                target_user_name=(
                    user_names.get(log.target_user_id) if log.target_user_id else None
                ),
                action=log.action,
                reason=log.reason,
                metadata=log.action_metadata,
                created_at=log.created_at,
            )
        )

    return AdminActionLogResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


# ============================================================================
# Analytics Endpoints
# ============================================================================

from app.services.analytics_service import analytics_service


@router.get("/analytics/overview")
async def get_analytics_overview(
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(30, ge=7, le=90, description="Number of days for data"),
):
    """Get comprehensive analytics overview."""
    return await analytics_service.get_analytics_overview(db, days)


@router.get("/analytics/users")
async def get_user_analytics(
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(30, ge=7, le=90),
):
    """Get user growth analytics."""
    growth = await analytics_service.get_user_growth(db, days)
    active = await analytics_service.get_active_users(db)
    return {
        "user_growth": growth,
        "dau": active["dau"],
        "wau": active["wau"],
        "mau": active["mau"],
    }


@router.get("/analytics/engagement")
async def get_engagement_analytics(
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(30, ge=7, le=90),
):
    """Get engagement metrics."""
    engagement = await analytics_service.get_engagement_metrics(db, days)
    content = await analytics_service.get_content_stats(db)
    return {
        "engagement": engagement,
        **content,
    }


# ============================================================================
# System Health Endpoints
# ============================================================================

from app.services.health_service import health_service


@router.get("/health")
async def get_system_health(
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get comprehensive system health status."""
    return await health_service.get_comprehensive_health(db)


@router.get("/health/database")
async def get_database_health(
    admin: Annotated[User, Depends(deps.get_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get database health status."""
    return await health_service.get_database_stats(db)


@router.get("/health/redis")
async def get_redis_health(
    admin: Annotated[User, Depends(deps.get_admin_user)],
):
    """Get Redis health status."""
    return await health_service.get_redis_stats()
