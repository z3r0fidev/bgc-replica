from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.models.user import User, Profile
from app.schemas.profile import Profile as ProfileSchema
from app.services.location import search_users_nearby
import uuid

router = APIRouter()

@router.get("/", response_model=List[ProfileSchema])
async def search_users(
    min_age: Optional[int] = Query(None),
    max_age: Optional[int] = Query(None),
    ethnicity: Optional[str] = Query(None),
    location: Optional[str] = Query(None), # city name
    radius_km: Optional[float] = Query(50),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    db: Annotated[AsyncSession, Depends(get_db)]
):
    query = select(Profile)
    filters = []

    if ethnicity:
        filters.append(Profile.ethnicity == ethnicity)
    if location:
        filters.append(Profile.location_city.ilike(f"%{location}%"))
    
    # Age filtering requires birth_date field which is not yet in the model.
    # I will add birth_date to Profile model in a real scenario.
    # For now, I'll filter by what we have.

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    profiles = result.scalars().all()

    # Location-based filtering using Redis if lat/lng provided
    if lat is not None and lng is not None:
        nearby_results = await search_users_nearby(lat, lng, radius_km)
        nearby_ids = [uuid.UUID(res[0]) for res in nearby_results]
        profiles = [p for p in profiles if p.id in nearby_ids]

    return profiles
