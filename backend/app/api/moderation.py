from typing import List, Annotated, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.validation import validate_query_params
from app.api import deps
from app.models.user import User
from app.models.community import ContentReport, ForumThread, ForumPost, StatusUpdate
from app.schemas.community import (
    ReportSchema,
    ReportCreate,
    UserReportCreate,
    ReportDetailSchema,
    ReporterInfo,
    ReportedUserInfo,
    ResolveReportRequest,
    ModerationStatsSchema,
)
from app.services.moderation_service import moderation_service
from app.services.warning_service import warning_service
import uuid

router = APIRouter()


async def _resolve_report_target_user_id(
    db: AsyncSession, report: ContentReport
) -> Optional[uuid.UUID]:
    """Resolve who should be warned/actioned for a report: the reported user
    directly for USER reports, or the author of the reported content otherwise."""
    if report.content_type == "USER":
        return report.content_id

    model_map = {
        "THREAD": ForumThread,
        "POST": ForumPost,
        "STATUS": StatusUpdate,
    }
    model = model_map.get(report.content_type)
    if not model:
        return None

    # select().where() rather than db.get() - StatusUpdate has a composite
    # (id, created_at) primary key since it was partitioned, and db.get()
    # requires the full PK tuple for a single scalar id.
    content = (
        await db.execute(select(model).where(model.id == report.content_id))
    ).scalar_one_or_none()
    return content.author_id if content else None


def require_admin(user: User) -> User:
    """Require user to be an admin/superuser."""
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return user


@router.post("/report", response_model=ReportSchema)
async def report_content(
    report_in: ReportCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await moderation_service.report_content(
        db,
        reporter_id=current_user.id,
        content_type=report_in.content_type,
        content_id=report_in.content_id,
        reason=report_in.reason,
    )


@router.post("/report-user", response_model=ReportSchema)
async def report_user(
    report_in: UserReportCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Report a user for inappropriate behavior.

    Valid reasons: HARASSMENT, SPAM, INAPPROPRIATE, FAKE_PROFILE, OTHER
    """
    if report_in.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot report yourself"
        )

    # Check if target user exists
    target = await db.get(User, report_in.user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Create report with USER content type
    reason_with_details = report_in.reason
    if report_in.details:
        reason_with_details = f"{report_in.reason}: {report_in.details}"

    return await moderation_service.report_content(
        db,
        reporter_id=current_user.id,
        content_type="USER",
        content_id=report_in.user_id,
        reason=reason_with_details,
    )


@router.get("/queue", response_model=List[ReportDetailSchema])
async def get_moderation_queue(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: Optional[str] = Query(
        None, description="Filter by status: PENDING, RESOLVED, DISMISSED"
    ),
    content_type: Optional[str] = Query(
        None, description="Filter by content type: USER, THREAD, POST, STATUS"
    ),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0, le=10000),
):
    """Get the moderation queue with detailed report info."""
    require_admin(current_user)
    validate_query_params(status_filter=status_filter, content_type=content_type)

    # Build query
    query = select(ContentReport)

    if status_filter:
        query = query.where(ContentReport.status == status_filter)
    else:
        # Default to pending reports
        query = query.where(ContentReport.status == "PENDING")

    if content_type:
        query = query.where(ContentReport.content_type == content_type)

    query = query.order_by(ContentReport.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    reports = result.scalars().all()

    # Enrich with details
    detailed_reports = []
    for report in reports:
        # Get reporter info
        reporter = await db.get(User, report.reporter_id)
        reporter_info = (
            ReporterInfo(
                id=reporter.id,
                name=reporter.name,
                email=reporter.email,
                image=reporter.image,
            )
            if reporter
            else ReporterInfo(id=report.reporter_id)
        )

        detail = ReportDetailSchema(
            id=report.id,
            reporter=reporter_info,
            content_type=report.content_type,
            content_id=report.content_id,
            reason=report.reason,
            status=report.status,
            created_at=report.created_at,
            reviewed_by=report.reviewed_by,
        )

        # Get reported user/content info
        if report.content_type == "USER":
            reported_user = await db.get(User, report.content_id)
            if reported_user:
                detail.reported_user = ReportedUserInfo(
                    id=reported_user.id,
                    name=reported_user.name,
                    email=reported_user.email,
                    image=reported_user.image,
                )
        elif report.content_type == "THREAD":
            thread = await db.get(ForumThread, report.content_id)
            if thread:
                detail.content_preview = thread.title[:200]
        elif report.content_type == "POST":
            post = await db.get(ForumPost, report.content_id)
            if post:
                detail.content_preview = post.content[:200]
        elif report.content_type == "STATUS":
            # StatusUpdate has a composite (id, created_at) primary key
            # since it was partitioned - db.get() needs the full PK tuple
            # and raises InvalidRequestError with a single scalar id.
            status_update = (
                await db.execute(
                    select(StatusUpdate).where(StatusUpdate.id == report.content_id)
                )
            ).scalar_one_or_none()
            if status_update:
                detail.content_preview = status_update.content[:200]

        detailed_reports.append(detail)

    return detailed_reports


@router.get("/queue/count")
async def get_queue_count(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get count of pending reports."""
    require_admin(current_user)

    result = await db.execute(
        select(func.count(ContentReport.id)).where(ContentReport.status == "PENDING")
    )
    count = result.scalar()

    return {"pending_count": count}


@router.get("/stats", response_model=ModerationStatsSchema)
async def get_moderation_stats(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get moderation statistics for the dashboard."""
    require_admin(current_user)

    # Pending count
    pending_result = await db.execute(
        select(func.count(ContentReport.id)).where(ContentReport.status == "PENDING")
    )
    pending_count = pending_result.scalar() or 0

    # Resolved today - by resolved_at (Issue #132), not created_at. A report
    # filed yesterday and resolved today counts; a report filed today but
    # still PENDING (or resolved before this column existed, resolved_at
    # NULL) does not.
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    resolved_result = await db.execute(
        select(func.count(ContentReport.id)).where(
            and_(
                ContentReport.status == "RESOLVED",
                ContentReport.resolved_at >= today_start,
            )
        )
    )
    resolved_today = resolved_result.scalar() or 0

    # Total reports
    total_result = await db.execute(select(func.count(ContentReport.id)))
    total_reports = total_result.scalar() or 0

    # Reports by type
    type_result = await db.execute(
        select(ContentReport.content_type, func.count(ContentReport.id))
        .where(ContentReport.status == "PENDING")
        .group_by(ContentReport.content_type)
    )
    reports_by_type = {row[0]: row[1] for row in type_result.fetchall()}

    # Reports by reason (extract first word/category)
    reason_result = await db.execute(
        select(ContentReport.reason, func.count(ContentReport.id))
        .where(ContentReport.status == "PENDING")
        .group_by(ContentReport.reason)
    )
    # Group similar reasons
    reason_counts: dict = {}
    for row in reason_result.fetchall():
        reason = row[0].split(":")[0].strip() if ":" in row[0] else row[0]
        reason_counts[reason] = reason_counts.get(reason, 0) + row[1]

    return ModerationStatsSchema(
        pending_count=pending_count,
        resolved_today=resolved_today,
        total_reports=total_reports,
        reports_by_type=reports_by_type,
        reports_by_reason=reason_counts,
    )


@router.get("/report/{report_id}", response_model=ReportDetailSchema)
async def get_report_detail(
    report_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get detailed info about a specific report."""
    require_admin(current_user)

    report = await db.get(ContentReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Get reporter info
    reporter = await db.get(User, report.reporter_id)
    reporter_info = (
        ReporterInfo(
            id=reporter.id,
            name=reporter.name,
            email=reporter.email,
            image=reporter.image,
        )
        if reporter
        else ReporterInfo(id=report.reporter_id)
    )

    detail = ReportDetailSchema(
        id=report.id,
        reporter=reporter_info,
        content_type=report.content_type,
        content_id=report.content_id,
        reason=report.reason,
        status=report.status,
        created_at=report.created_at,
        reviewed_by=report.reviewed_by,
        resolved_at=report.resolved_at,
    )

    # Get reported content/user info
    if report.content_type == "USER":
        reported_user = await db.get(User, report.content_id)
        if reported_user:
            detail.reported_user = ReportedUserInfo(
                id=reported_user.id,
                name=reported_user.name,
                email=reported_user.email,
                image=reported_user.image,
            )

    return detail


@router.post("/resolve/{report_id}")
async def resolve_report(
    report_id: uuid.UUID,
    request: ResolveReportRequest,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Resolve a report with a specific action.

    Actions:
    - dismiss: Dismiss the report (no action taken)
    - warn_user: Send a warning to the reported user
    - delete_content: Delete the reported content
    - ban_user: Ban the reported user
    """
    require_admin(current_user)

    report = await db.get(ContentReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report has already been resolved",
        )

    action = request.action.lower()
    valid_actions = ["dismiss", "warn_user", "delete_content", "ban_user"]
    if action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action. Must be one of: {', '.join(valid_actions)}",
        )

    # Handle action
    action_taken = action
    if action == "dismiss":
        report.status = "DISMISSED"
    elif action == "warn_user":
        report.status = "RESOLVED"
        target_user_id = await _resolve_report_target_user_id(db, report)
        if target_user_id:
            await warning_service.issue_warning(
                db,
                user_id=target_user_id,
                admin_id=current_user.id,
                reason=report.reason,
                report_id=report.id,
            )
    elif action == "delete_content":
        report.status = "RESOLVED"
        # Delete the content based on type
        if report.content_type == "THREAD":
            thread = await db.get(ForumThread, report.content_id)
            if thread:
                await db.delete(thread)
        elif report.content_type == "POST":
            post = await db.get(ForumPost, report.content_id)
            if post:
                await db.delete(post)
        elif report.content_type == "STATUS":
            # See the report-detail endpoint above for why db.get() can't
            # be used here now that StatusUpdate has a composite PK.
            status_update = (
                await db.execute(
                    select(StatusUpdate).where(StatusUpdate.id == report.content_id)
                )
            ).scalar_one_or_none()
            if status_update:
                await db.delete(status_update)
    elif action == "ban_user":
        report.status = "RESOLVED"
        if report.content_type == "USER":
            user_to_ban = await db.get(User, report.content_id)
            if user_to_ban:
                user_to_ban.is_active = False

    report.reviewed_by = current_user.id
    report.resolved_at = datetime.utcnow()
    await db.commit()

    return {
        "status": "success",
        "report_id": str(report_id),
        "action": action_taken,
        "new_status": report.status,
    }


@router.post("/bulk-resolve")
async def bulk_resolve_reports(
    report_ids: List[uuid.UUID],
    request: ResolveReportRequest,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Resolve multiple reports at once."""
    require_admin(current_user)

    resolved = 0
    for report_id in report_ids:
        report = await db.get(ContentReport, report_id)
        if report and report.status == "PENDING":
            if request.action == "dismiss":
                report.status = "DISMISSED"
            else:
                report.status = "RESOLVED"
            report.reviewed_by = current_user.id
            report.resolved_at = datetime.utcnow()
            resolved += 1

    await db.commit()

    return {"status": "success", "resolved_count": resolved, "action": request.action}
