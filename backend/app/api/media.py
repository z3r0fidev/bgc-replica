from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.api import deps
from app.models.user import User, Media
from app.schemas.media import Media as MediaSchema
from app.schemas.common import PaginatedResponse
from app.core.pagination import paginate_query
import uuid

router = APIRouter()

@router.get("/original", response_model=PaginatedResponse[MediaSchema])
async def get_original_programming(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
    cursor: Optional[str] = None
):
    """
    Fetch BGC Original Video Programming.
    """
    stmt = select(Media).where(Media.is_original == True).order_by(desc(Media.created_at))
    return await paginate_query(db, stmt, Media, limit, cursor)

@router.get("/user/{user_id}", response_model=List[MediaSchema])
async def get_user_media(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Fetch all media for a specific user.
    """
    result = await db.execute(select(Media).where(Media.user_id == user_id).order_by(desc(Media.created_at)))
    return result.scalars().all()
