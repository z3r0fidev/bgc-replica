"""
Gallery API Routes

Handles media uploads, gallery management, and album operations.
Spec 010 - Media Gallery & Albums
"""

from typing import Annotated, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.gallery import GalleryMedia, Album, AlbumMedia
from app.schemas.gallery import (
    MediaUploadResponse,
    MediaUpdate,
    GalleryMedia as GalleryMediaSchema,
    GalleryPage,
    AlbumCreate,
    AlbumUpdate,
    Album as AlbumSchema,
    AlbumWithMedia,
    AlbumPage,
    AlbumMediaAdd,
    AlbumBulkReorder,
    MediaAddResponse,
    ShareLinkCreate,
    ShareLinkResponse,
)
from app.services.storage import storage_service
from app.services.media_processor import media_processor
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Duration, Limiter, Rate
from datetime import datetime, timedelta
import secrets
import base64

router = APIRouter()


# ============== Media Endpoints ==============


@router.post(
    "/upload",
    response_model=MediaUploadResponse,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(20, Duration.MINUTE))))],
)
async def upload_media(
    file: UploadFile = File(...),
    privacy: str = Query("PUBLIC", pattern="^(PUBLIC|FRIENDS_ONLY|PRIVATE)$"),
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Upload a media file (image or video) to the gallery.

    - Images: JPEG, PNG, WebP, GIF (max 10MB)
    - Videos: MP4, WebM (max 100MB)
    """
    content = await file.read()
    content_type = file.content_type or "application/octet-stream"

    # Validate file type
    if not media_processor.is_supported_type(content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}. Supported: JPEG, PNG, WebP, GIF, MP4, WebM",
        )

    # Validate file size
    is_valid, error_msg = media_processor.validate_file_size(content, content_type)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=error_msg
        )

    try:
        # Get dimensions and process based on type
        width, height = None, None
        duration_seconds = None

        if media_processor.is_image(content_type):
            # Strip EXIF data for privacy
            content = media_processor.strip_exif(content, content_type)
            width, height = media_processor.get_image_dimensions(content)
        elif media_processor.is_video(content_type):
            # Extract video metadata
            width, height = media_processor.get_video_dimensions(content, content_type)
            duration_seconds = media_processor.get_video_duration(content, content_type)

        # Upload original file
        media_id = uuid.uuid4()
        ext = file.filename.split(".")[-1] if file.filename else "bin"
        _storage_path = f"{current_user.id}/gallery/{media_id}.{ext}"  # noqa: F841

        upload_result = await storage_service.upload_file(
            content, f"{media_id}.{ext}", content_type
        )

        # Generate and upload thumbnail (works for both images and videos)
        thumbnail_url = None
        thumb_bytes = media_processor.generate_thumbnail(content, content_type)
        if thumb_bytes:
            _thumb_path = f"{current_user.id}/gallery/thumbs/{media_id}.webp"  # noqa: F841
            thumb_result = await storage_service.upload_file(
                thumb_bytes, f"{media_id}.webp", "image/webp"
            )
            thumbnail_url = thumb_result["url"]

        # Create database record
        new_media = GalleryMedia(
            id=media_id,
            user_id=current_user.id,
            type=media_processor.get_media_type(content_type),
            url=upload_result["url"],
            thumbnail_url=thumbnail_url,
            storage_path=upload_result["storage_path"],
            filename=file.filename,
            mime_type=content_type,
            width=width,
            height=height,
            size_bytes=len(content),
            duration_seconds=duration_seconds,
            privacy=privacy,
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


@router.get("/", response_model=GalleryPage)
async def list_my_media(
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = None,
    type: Optional[str] = Query(None, pattern="^(IMAGE|VIDEO)$"),
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    List current user's gallery media (paginated).
    """
    # Build base query
    query = (
        select(GalleryMedia)
        .where(GalleryMedia.user_id == current_user.id)
        .order_by(desc(GalleryMedia.created_at))
    )

    if type:
        query = query.where(GalleryMedia.type == type)

    # Handle cursor-based pagination
    if cursor:
        try:
            cursor_time = datetime.fromisoformat(base64.b64decode(cursor).decode())
            query = query.where(GalleryMedia.created_at < cursor_time)
        except Exception:
            pass

    # Get total count
    count_query = (
        select(func.count())
        .select_from(GalleryMedia)
        .where(GalleryMedia.user_id == current_user.id)
    )
    if type:
        count_query = count_query.where(GalleryMedia.type == type)
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0

    # Execute main query
    query = query.limit(limit + 1)  # Fetch one extra to check for more
    result = await db.execute(query)
    items = list(result.scalars().all())

    # Determine next cursor
    next_cursor = None
    if len(items) > limit:
        items = items[:limit]
        last_item = items[-1]
        next_cursor = base64.b64encode(
            last_item.created_at.isoformat().encode()
        ).decode()

    return GalleryPage(items=items, next_cursor=next_cursor, total_count=total_count)


# NOTE: /albums must be registered before /{media_id} so FastAPI doesn't try to
# parse "albums" as a UUID and return 422.
@router.get("/albums", response_model=AlbumPage)
async def list_my_albums_route(
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = None,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    return await list_my_albums(limit=limit, cursor=cursor, current_user=current_user, db=db)


@router.get("/{media_id}", response_model=GalleryMediaSchema)
async def get_media(
    media_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Get a single media item by ID.
    """
    result = await db.execute(select(GalleryMedia).where(GalleryMedia.id == media_id))
    media = result.scalars().first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Check access (owner always has access)
    if media.user_id != current_user.id:
        if media.privacy == "PRIVATE":
            raise HTTPException(status_code=404, detail="Media not found")
        # TODO: Check FRIENDS_ONLY against friendship status

    # Increment view count if not owner
    if media.user_id != current_user.id:
        media.view_count += 1
        await db.commit()

    return media


@router.patch("/{media_id}", response_model=GalleryMediaSchema)
async def update_media(
    media_id: uuid.UUID,
    update: MediaUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Update media privacy settings.
    """
    result = await db.execute(
        select(GalleryMedia).where(
            GalleryMedia.id == media_id, GalleryMedia.user_id == current_user.id
        )
    )
    media = result.scalars().first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if update.privacy:
        media.privacy = update.privacy

    await db.commit()
    await db.refresh(media)

    return media


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Delete a media item.
    """
    result = await db.execute(
        select(GalleryMedia).where(
            GalleryMedia.id == media_id, GalleryMedia.user_id == current_user.id
        )
    )
    media = result.scalars().first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Delete from storage
    try:
        await storage_service.delete_file(media.storage_path)
        # TODO: Delete thumbnail as well
    except Exception:
        pass  # Continue even if storage delete fails

    await db.delete(media)
    await db.commit()


@router.get("/users/{user_id}", response_model=GalleryPage)
async def get_user_gallery(
    user_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = None,
    type: Optional[str] = Query(None, pattern="^(IMAGE|VIDEO)$"),
    current_user: Annotated[User, Depends(deps.get_current_user_optional)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Get a user's public gallery with privacy filtering.

    - Owner sees all their media
    - Friends see PUBLIC and FRIENDS_ONLY media
    - Others see only PUBLIC media
    """
    # Check if viewing own gallery
    is_owner = current_user and current_user.id == user_id

    # Build privacy filter
    if is_owner:
        # Owner sees everything
        privacy_filter = True
    else:
        # Check if current user is a friend
        is_friend = False
        if current_user:
            # TODO: Implement friendship check
            # For now, non-owners only see PUBLIC
            pass

        if is_friend:
            privacy_filter = GalleryMedia.privacy.in_(["PUBLIC", "FRIENDS_ONLY"])
        else:
            privacy_filter = GalleryMedia.privacy == "PUBLIC"

    # Build query
    query = (
        select(GalleryMedia)
        .where(GalleryMedia.user_id == user_id, privacy_filter)
        .order_by(desc(GalleryMedia.created_at))
    )

    if type:
        query = query.where(GalleryMedia.type == type)

    # Handle cursor pagination
    if cursor:
        try:
            cursor_time = datetime.fromisoformat(base64.b64decode(cursor).decode())
            query = query.where(GalleryMedia.created_at < cursor_time)
        except Exception:
            pass

    # Get total count (with privacy filter)
    count_query = (
        select(func.count())
        .select_from(GalleryMedia)
        .where(GalleryMedia.user_id == user_id, privacy_filter)
    )
    if type:
        count_query = count_query.where(GalleryMedia.type == type)
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0

    # Execute query
    query = query.limit(limit + 1)
    result = await db.execute(query)
    items = list(result.scalars().all())

    # Determine next cursor
    next_cursor = None
    if len(items) > limit:
        items = items[:limit]
        last_item = items[-1]
        next_cursor = base64.b64encode(
            last_item.created_at.isoformat().encode()
        ).decode()

    return GalleryPage(items=items, next_cursor=next_cursor, total_count=total_count)


# ============== Album Endpoints ==============


@router.post("/albums", response_model=AlbumSchema, status_code=status.HTTP_201_CREATED)
async def create_album(
    album_data: AlbumCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Create a new album.
    """
    new_album = Album(
        user_id=current_user.id,
        title=album_data.title,
        description=album_data.description,
        privacy=album_data.privacy,
    )

    db.add(new_album)
    await db.commit()
    await db.refresh(new_album)

    # Add media_count
    return AlbumSchema(
        id=new_album.id,
        user_id=new_album.user_id,
        title=new_album.title,
        description=new_album.description,
        cover_media_id=None,
        cover_url=None,
        privacy=new_album.privacy,
        media_count=0,
        created_at=new_album.created_at,
    )


@router.get("/albums", response_model=AlbumPage)
async def list_my_albums(
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = None,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    List current user's albums.
    """
    query = (
        select(Album)
        .where(Album.user_id == current_user.id)
        .options(selectinload(Album.cover_media))
        .order_by(desc(Album.created_at))
    )

    if cursor:
        try:
            cursor_time = datetime.fromisoformat(base64.b64decode(cursor).decode())
            query = query.where(Album.created_at < cursor_time)
        except Exception:
            pass

    query = query.limit(limit + 1)
    result = await db.execute(query)
    albums = list(result.scalars().all())

    next_cursor = None
    if len(albums) > limit:
        albums = albums[:limit]
        last = albums[-1]
        next_cursor = base64.b64encode(last.created_at.isoformat().encode()).decode()

    # Get media counts for each album
    album_ids = [a.id for a in albums]
    count_query = (
        select(AlbumMedia.album_id, func.count(AlbumMedia.media_id).label("count"))
        .where(AlbumMedia.album_id.in_(album_ids))
        .group_by(AlbumMedia.album_id)
    )
    count_result = await db.execute(count_query)
    counts = {row.album_id: row.count for row in count_result}

    items = []
    for album in albums:
        items.append(
            AlbumSchema(
                id=album.id,
                user_id=album.user_id,
                title=album.title,
                description=album.description,
                cover_media_id=album.cover_media_id,
                cover_url=(
                    album.cover_media.thumbnail_url if album.cover_media else None
                ),
                privacy=album.privacy,
                media_count=counts.get(album.id, 0),
                created_at=album.created_at,
            )
        )

    return AlbumPage(items=items, next_cursor=next_cursor)


@router.get("/albums/{album_id}", response_model=AlbumWithMedia)
async def get_album(
    album_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Get an album with all its media.
    """
    result = await db.execute(
        select(Album)
        .where(Album.id == album_id)
        .options(
            selectinload(Album.cover_media),
            selectinload(Album.media_associations).selectinload(AlbumMedia.media),
        )
    )
    album = result.scalars().first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Check access
    if album.user_id != current_user.id:
        if album.privacy == "PRIVATE":
            raise HTTPException(status_code=404, detail="Album not found")
        # TODO: Check FRIENDS_ONLY

    # Build media list with positions
    media_list = []
    for assoc in sorted(album.media_associations, key=lambda x: x.position):
        media_dict = {
            "id": assoc.media.id,
            "user_id": assoc.media.user_id,
            "type": assoc.media.type,
            "url": assoc.media.url,
            "thumbnail_url": assoc.media.thumbnail_url,
            "filename": assoc.media.filename,
            "mime_type": assoc.media.mime_type,
            "width": assoc.media.width,
            "height": assoc.media.height,
            "size_bytes": assoc.media.size_bytes,
            "duration_seconds": assoc.media.duration_seconds,
            "privacy": assoc.media.privacy,
            "view_count": assoc.media.view_count,
            "created_at": assoc.media.created_at,
            "position": assoc.position,
        }
        media_list.append(media_dict)

    return AlbumWithMedia(
        id=album.id,
        user_id=album.user_id,
        title=album.title,
        description=album.description,
        cover_media_id=album.cover_media_id,
        cover_url=album.cover_media.thumbnail_url if album.cover_media else None,
        privacy=album.privacy,
        media_count=len(media_list),
        created_at=album.created_at,
        media=media_list,
    )


@router.patch("/albums/{album_id}", response_model=AlbumSchema)
async def update_album(
    album_id: uuid.UUID,
    update: AlbumUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Update album details.
    """
    result = await db.execute(
        select(Album)
        .where(Album.id == album_id, Album.user_id == current_user.id)
        .options(selectinload(Album.cover_media))
    )
    album = result.scalars().first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    if update.title is not None:
        album.title = update.title
    if update.description is not None:
        album.description = update.description
    if update.privacy is not None:
        album.privacy = update.privacy
    if update.cover_media_id is not None:
        # Verify the media belongs to the user
        media_result = await db.execute(
            select(GalleryMedia).where(
                GalleryMedia.id == update.cover_media_id,
                GalleryMedia.user_id == current_user.id,
            )
        )
        if media_result.scalars().first():
            album.cover_media_id = update.cover_media_id

    await db.commit()
    await db.refresh(album)

    # Get media count
    count_result = await db.execute(
        select(func.count())
        .select_from(AlbumMedia)
        .where(AlbumMedia.album_id == album.id)
    )
    media_count = count_result.scalar() or 0

    return AlbumSchema(
        id=album.id,
        user_id=album.user_id,
        title=album.title,
        description=album.description,
        cover_media_id=album.cover_media_id,
        cover_url=album.cover_media.thumbnail_url if album.cover_media else None,
        privacy=album.privacy,
        media_count=media_count,
        created_at=album.created_at,
    )


@router.delete("/albums/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_album(
    album_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Delete an album (media items are NOT deleted).
    """
    result = await db.execute(
        select(Album).where(Album.id == album_id, Album.user_id == current_user.id)
    )
    album = result.scalars().first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    await db.delete(album)
    await db.commit()


@router.post("/albums/{album_id}/media", response_model=MediaAddResponse)
async def add_media_to_album(
    album_id: uuid.UUID,
    data: AlbumMediaAdd,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Add media items to an album.
    """
    # Verify album ownership
    result = await db.execute(
        select(Album).where(Album.id == album_id, Album.user_id == current_user.id)
    )
    album = result.scalars().first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Get current max position
    pos_result = await db.execute(
        select(func.max(AlbumMedia.position)).where(AlbumMedia.album_id == album_id)
    )
    max_pos = pos_result.scalar() or -1

    # Verify media ownership and add to album
    added_count = 0
    for media_id in data.media_ids:
        # Check if media belongs to user
        media_result = await db.execute(
            select(GalleryMedia).where(
                GalleryMedia.id == media_id, GalleryMedia.user_id == current_user.id
            )
        )
        if not media_result.scalars().first():
            continue

        # Check if already in album
        existing = await db.execute(
            select(AlbumMedia).where(
                AlbumMedia.album_id == album_id, AlbumMedia.media_id == media_id
            )
        )
        if existing.scalars().first():
            continue

        # Add to album
        max_pos += 1
        assoc = AlbumMedia(album_id=album_id, media_id=media_id, position=max_pos)
        db.add(assoc)
        added_count += 1

    await db.commit()

    # Get total count
    count_result = await db.execute(
        select(func.count())
        .select_from(AlbumMedia)
        .where(AlbumMedia.album_id == album_id)
    )
    total = count_result.scalar() or 0

    return MediaAddResponse(added_count=added_count, album_media_count=total)


@router.put("/albums/{album_id}/reorder", response_model=AlbumWithMedia)
async def reorder_album_media(
    album_id: uuid.UUID,
    data: AlbumBulkReorder,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Reorder media within an album.
    Accepts a list of media IDs in the desired order.
    """
    # Verify album ownership
    result = await db.execute(
        select(Album)
        .where(Album.id == album_id, Album.user_id == current_user.id)
        .options(
            selectinload(Album.cover_media),
            selectinload(Album.media_associations).selectinload(AlbumMedia.media),
        )
    )
    album = result.scalars().first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Get current media IDs in album
    current_media_ids = {assoc.media_id for assoc in album.media_associations}
    requested_ids = set(data.media_ids)

    # Validate all requested IDs exist in the album
    if requested_ids != current_media_ids:
        raise HTTPException(
            status_code=400,
            detail="Media IDs must match exactly the media in the album",
        )

    # Update positions
    for position, media_id in enumerate(data.media_ids):
        for assoc in album.media_associations:
            if assoc.media_id == media_id:
                assoc.position = position
                break

    await db.commit()

    # Return updated album
    media_list = []
    for assoc in sorted(album.media_associations, key=lambda x: x.position):
        media_dict = {
            "id": assoc.media.id,
            "user_id": assoc.media.user_id,
            "type": assoc.media.type,
            "url": assoc.media.url,
            "thumbnail_url": assoc.media.thumbnail_url,
            "filename": assoc.media.filename,
            "mime_type": assoc.media.mime_type,
            "width": assoc.media.width,
            "height": assoc.media.height,
            "size_bytes": assoc.media.size_bytes,
            "duration_seconds": assoc.media.duration_seconds,
            "privacy": assoc.media.privacy,
            "view_count": assoc.media.view_count,
            "created_at": assoc.media.created_at,
            "position": assoc.position,
        }
        media_list.append(media_dict)

    return AlbumWithMedia(
        id=album.id,
        user_id=album.user_id,
        title=album.title,
        description=album.description,
        cover_media_id=album.cover_media_id,
        cover_url=album.cover_media.thumbnail_url if album.cover_media else None,
        privacy=album.privacy,
        media_count=len(media_list),
        created_at=album.created_at,
        media=media_list,
    )


@router.delete(
    "/albums/{album_id}/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remove_media_from_album(
    album_id: uuid.UUID,
    media_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Remove a media item from an album.
    """
    # Verify album ownership
    result = await db.execute(
        select(Album).where(Album.id == album_id, Album.user_id == current_user.id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Album not found")

    # Delete association
    assoc_result = await db.execute(
        select(AlbumMedia).where(
            AlbumMedia.album_id == album_id, AlbumMedia.media_id == media_id
        )
    )
    assoc = assoc_result.scalars().first()

    if assoc:
        await db.delete(assoc)
        await db.commit()


@router.post("/albums/{album_id}/share", response_model=ShareLinkResponse)
async def create_share_link(
    album_id: uuid.UUID,
    data: ShareLinkCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Generate a shareable link for an album.
    """
    result = await db.execute(
        select(Album).where(Album.id == album_id, Album.user_id == current_user.id)
    )
    album = result.scalars().first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    # Generate share token
    share_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)

    album.share_token = share_token
    album.share_expires_at = expires_at

    await db.commit()

    # Build share URL (frontend will handle this route)
    share_url = f"/shared/album/{share_token}"

    return ShareLinkResponse(
        share_url=share_url, share_token=share_token, expires_at=expires_at
    )


@router.get("/albums/shared/{token}", response_model=AlbumWithMedia)
async def get_shared_album(
    token: str, db: Annotated[AsyncSession, Depends(get_db)] = None
):
    """
    Access a shared album (no authentication required).
    """
    result = await db.execute(
        select(Album)
        .where(Album.share_token == token)
        .options(
            selectinload(Album.cover_media),
            selectinload(Album.media_associations).selectinload(AlbumMedia.media),
        )
    )
    album = result.scalars().first()

    if not album:
        raise HTTPException(status_code=404, detail="Album not found or link expired")

    # Check expiration
    if album.share_expires_at and album.share_expires_at < datetime.utcnow():
        raise HTTPException(status_code=404, detail="Share link has expired")

    # Build media list
    media_list = []
    for assoc in sorted(album.media_associations, key=lambda x: x.position):
        media_dict = {
            "id": assoc.media.id,
            "user_id": assoc.media.user_id,
            "type": assoc.media.type,
            "url": assoc.media.url,
            "thumbnail_url": assoc.media.thumbnail_url,
            "filename": assoc.media.filename,
            "mime_type": assoc.media.mime_type,
            "width": assoc.media.width,
            "height": assoc.media.height,
            "size_bytes": assoc.media.size_bytes,
            "duration_seconds": assoc.media.duration_seconds,
            "privacy": "PUBLIC",  # Shared albums show as public
            "view_count": assoc.media.view_count,
            "created_at": assoc.media.created_at,
            "position": assoc.position,
        }
        media_list.append(media_dict)

    return AlbumWithMedia(
        id=album.id,
        user_id=album.user_id,
        title=album.title,
        description=album.description,
        cover_media_id=album.cover_media_id,
        cover_url=album.cover_media.thumbnail_url if album.cover_media else None,
        privacy=album.privacy,
        media_count=len(media_list),
        created_at=album.created_at,
        media=media_list,
    )
