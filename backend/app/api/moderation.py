from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.community import ContentReport
from app.schemas.community import ReportSchema, ReportCreate
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
