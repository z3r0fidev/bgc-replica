from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.api import deps
from app.models.user import User, Profile as ProfileModel, Media, ProfileRating
from app.schemas.profile import Profile, ProfileUpdate
from app.schemas.media import Media as MediaSchema
from app.schemas.social import ProfileRatingCreate
from app.services.storage import storage_service
import uuid

router = APIRouter()

@router.get("/me", response_model=Profile)
async def get_my_profile(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    result = await db.execute(select(ProfileModel).where(ProfileModel.id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        # Create default profile if not exists
        profile = ProfileModel(id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile

@router.put("/me", response_model=Profile)
async def update_my_profile(
    profile_in: ProfileUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    result = await db.execute(select(ProfileModel).where(ProfileModel.id == current_user.id))
    profile = result.scalars().first()
    
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile

@router.get("/{user_id}", response_model=Profile)
async def get_user_profile(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    result = await db.execute(select(ProfileModel).where(ProfileModel.id == user_id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.post("/me/media", response_model=MediaSchema)
async def upload_gallery_media(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...)
):
    content = await file.read()
    upload_result = await storage_service.upload_file(content, file.filename, file.content_type)
    
    new_media = Media(
        user_id=current_user.id,
        url=upload_result["url"],
        storage_path=upload_result["storage_path"],
        type="IMAGE" if file.content_type.startswith("image") else "VIDEO"
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
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # Check if rating already exists
    result = await db.execute(select(ProfileRating).where(
        and_(
            ProfileRating.from_user_id == current_user.id,
            ProfileRating.to_user_id == user_id
        )
    ))
    existing = result.scalars().first()
    
    if existing:
        existing.score = rating_in.score
    else:
        new_rating = ProfileRating(
            from_user_id=current_user.id,
            to_user_id=user_id,
            score=rating_in.score
        )
        db.add(new_rating)
    
    await db.commit()
    
    # Calculate average
    avg_result = await db.execute(select(func.avg(ProfileRating.score)).where(ProfileRating.to_user_id == user_id))
    average = avg_result.scalar() or 0.0
    
    return {"average_rating": float(average)}

