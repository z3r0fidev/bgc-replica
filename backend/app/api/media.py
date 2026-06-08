from typing import List, Annotated, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.api import deps
from app.models.user import User, Media
from app.schemas.media import Media as MediaSchema
from app.schemas.common import PaginatedResponse
from app.core.pagination import paginate_query
from app.services.storage import storage_service
from fastapi_limiter.depends import RateLimiter

router = APIRouter()


@router.post(
    "/upload",
    response_model=MediaSchema,
    dependencies=[Depends(RateLimiter(times=20, seconds=60))],
)
async def upload_media(
    file: UploadFile = File(...),
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Upload a media file and record it in the database.
    """
    # Validation: 10MB for images, 50MB for videos
    MAX_IMAGE_SIZE = 10 * 1024 * 1024
    MAX_VIDEO_SIZE = 50 * 1024 * 1024

    is_video = file.content_type.startswith("video/")
    max_size = MAX_VIDEO_SIZE if is_video else MAX_IMAGE_SIZE

    try:
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Max allowed: {max_size // (1024*1024)}MB",
            )

        upload_result = await storage_service.upload_file(
            content, file.filename, file.content_type
        )

        media_type = "IMAGE"
        if file.content_type.startswith("video/"):
            media_type = "VIDEO"

        new_media = Media(
            user_id=current_user.id,
            url=upload_result["url"],
            storage_path=upload_result["storage_path"],
            type=media_type,
        )

        db.add(new_media)
        await db.commit()
        await db.refresh(new_media)

        return new_media
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )


@router.get("/original", response_model=PaginatedResponse[MediaSchema])
async def get_original_programming(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
    cursor: Optional[str] = None,
):
    """
    Fetch BGC Original Video Programming.
    """
    stmt = (
        select(Media).where(Media.is_original).order_by(desc(Media.created_at))
    )
    return await paginate_query(db, stmt, Media, limit, cursor)


@router.get("/user/{user_id}", response_model=List[MediaSchema])
async def get_user_media(
    user_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Fetch all media for a specific user.
    """
    result = await db.execute(
        select(Media).where(Media.user_id == user_id).order_by(desc(Media.created_at))
    )
    return result.scalars().all()
