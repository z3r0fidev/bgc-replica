from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.community import ContentReport
from app.schemas.community import ReportSchema, ReportCreate, UserReportCreate
from app.services.moderation_service import moderation_service
import uuid

router = APIRouter()

@router.post("/report", response_model=ReportSchema)
async def report_content(
    report_in: ReportCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    return await moderation_service.report_content(
        db,
        reporter_id=current_user.id,
        content_type=report_in.content_type,
        content_id=report_in.content_id,
        reason=report_in.reason
    )


@router.post("/report-user", response_model=ReportSchema)
async def report_user(
    report_in: UserReportCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Report a user for inappropriate behavior.

    Valid reasons: HARASSMENT, SPAM, INAPPROPRIATE, FAKE_PROFILE, OTHER
    """
    if report_in.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot report yourself"
        )

    # Check if target user exists
    target = await db.get(User, report_in.user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
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
        reason=reason_with_details
    )

@router.get("/queue", response_model=List[ReportSchema])
async def get_moderation_queue(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    stmt = select(ContentReport).where(ContentReport.status == "PENDING").order_by(ContentReport.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/resolve/{report_id}")
async def resolve_report(
    report_id: uuid.UUID,
    action: str, # dismiss, delete_content
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(select(ContentReport).where(ContentReport.id == report_id))
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = "RESOLVED"
    report.reviewed_by = current_user.id
    
    # Logic for action (dismiss vs delete) would go here
    
    await db.commit()
    return {"status": "resolved", "action": action}
