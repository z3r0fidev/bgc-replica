from typing import Annotated, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Duration, Limiter, Rate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.api import deps
from app.models.user import User, Profile as ProfileModel, Media, ProfileRating
from app.schemas.profile import Profile, ProfileUpdate
from app.schemas.media import Media as MediaSchema
from app.schemas.social import ProfileRatingCreate
from app.services.storage import storage_service
from app.services.profile_service import profile_service
from app.services.media_processor import media_processor
import uuid
from sqlalchemy.orm import selectinload

router = APIRouter()


@router.get("/me", response_model=Profile)
async def get_my_profile(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Try to get from cache first
    profile = await profile_service.get_profile_cached(db, current_user.id)

    if not profile:
        # Create default profile if not exists
        new_profile = ProfileModel(id=current_user.id)
        db.add(new_profile)
        await db.commit()

        # Fetch with user relationship and cache it
        profile = await profile_service.get_profile_cached(db, current_user.id)

    return profile


@router.put("/me", response_model=Profile)
async def update_my_profile(
    profile_in: ProfileUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(ProfileModel).where(ProfileModel.id == current_user.id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    # Invalidate cache
    await profile_service.invalidate_profile_cache(current_user.id)

    return profile


@router.patch("/me", response_model=Profile)
async def patch_my_profile(
    profile_in: ProfileUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(ProfileModel).where(ProfileModel.id == current_user.id)
    )
    profile = result.scalars().first()

    if not profile:
        profile = ProfileModel(id=current_user.id)
        db.add(profile)
        await db.flush()  # Ensure it's attached

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "social_links" and profile.social_links:
            # Merge JSONB links
            merged_links = {**(profile.social_links or {}), **(value or {})}
            setattr(profile, field, merged_links)
        else:
            setattr(profile, field, value)

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    # Invalidate cache
    await profile_service.invalidate_profile_cache(current_user.id)

    # Load author relationship for the response
    # (Actually we return Profile which has user via relationship)
    # But we might need to refresh with selectinload to be sure for the pydantic model
    result = await db.execute(
        select(ProfileModel)
        .where(ProfileModel.id == profile.id)
        .options(selectinload(ProfileModel.user))
    )
    return result.scalars().first()


@router.put("/me/privacy")
async def update_privacy_settings(
    privacy_settings: Annotated[Dict[str, str], Body(...)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(ProfileModel).where(ProfileModel.id == current_user.id)
    )
    profile = result.scalars().first()

    if not profile:
        profile = ProfileModel(id=current_user.id)
        db.add(profile)
        await db.flush()

    # Reject keys/values containing NUL bytes or lone surrogates — these cannot be
    # stored in JSONB because asyncpg's JSON encoder fails on them differently than
    # the global UnicodeError/InterfaceError handlers can catch.
    for key, value in privacy_settings.items():
        for s in (key, value):
            if "\x00" in s:
                raise HTTPException(
                    status_code=422, detail="Invalid character in input"
                )
            try:
                s.encode("utf-8")
            except UnicodeEncodeError:
                raise HTTPException(
                    status_code=422, detail="Invalid character in input"
                )

    # Merge or replace privacy settings
    current_settings = profile.privacy_settings or {}
    new_settings = {**current_settings, **privacy_settings}
    profile.privacy_settings = new_settings

    db.add(profile)
    await db.commit()

    # Invalidate cache
    await profile_service.invalidate_profile_cache(current_user.id)

    return {"status": "ok", "privacy_settings": new_settings}


@router.get("/{user_id}", response_model=Profile)
async def get_user_profile(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        Optional[User], Depends(deps.get_current_user_optional)
    ] = None,
):
    # Use cache-aside pattern via profile_service
    unmasked_profile = await profile_service.get_profile_cached(db, user_id)

    if not unmasked_profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    is_owner = current_user.id == user_id if current_user else False
    is_friend = False
    if current_user and not is_owner:
        is_friend = await profile_service.get_friendship_status(
            db, current_user.id, user_id
        )

    # Apply masking to the pydantic model or convert back/forth
    # profile_service.apply_privacy_mask expects ProfileModel
    # I'll update it to handle dict or pydantic

    masked_data = profile_service.apply_privacy_mask(
        unmasked_profile, is_friend, is_owner
    )
    return masked_data


@router.post(
    "/me/media",
    response_model=MediaSchema,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(40, Duration.MINUTE))))],
)
async def upload_gallery_media(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
):
    content = await file.read()

    if not file.content_type:
        raise HTTPException(status_code=400, detail="Content-Type header required")

    # Validate file type, size, and magic bytes
    is_valid, error = media_processor.validate_upload(content, file.content_type)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Strip EXIF metadata from images for privacy
    if media_processor.is_image(file.content_type):
        content = media_processor.strip_exif(content, file.content_type)

    # Use safe filename derived from content type
    safe_filename = (
        f"{uuid.uuid4()}.{media_processor.get_safe_extension(file.content_type)}"
    )

    upload_result = await storage_service.upload_file(
        content, safe_filename, file.content_type
    )

    new_media = Media(
        user_id=current_user.id,
        url=upload_result["url"],
        storage_path=upload_result["storage_path"],
        type=media_processor.get_media_type(file.content_type),
    )
    db.add(new_media)
    await db.commit()
    await db.refresh(new_media)
    return new_media


@router.post("/{user_id}/rate")
async def rate_user_profile(
    user_id: uuid.UUID,
    rating_in: ProfileRatingCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Check if rating already exists
    result = await db.execute(
        select(ProfileRating).where(
            and_(
                ProfileRating.from_user_id == current_user.id,
                ProfileRating.to_user_id == user_id,
            )
        )
    )
    existing = result.scalars().first()

    if existing:
        existing.score = rating_in.score
    else:
        new_rating = ProfileRating(
            from_user_id=current_user.id, to_user_id=user_id, score=rating_in.score
        )
        db.add(new_rating)

    await db.commit()

    # Calculate average
    avg_result = await db.execute(
        select(func.avg(ProfileRating.score)).where(ProfileRating.to_user_id == user_id)
    )
    average = avg_result.scalar() or 0.0

    return {"average_rating": float(average)}
