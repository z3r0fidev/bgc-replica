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

from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.core.database import get_db
from app.models.user import User, Profile
from app.schemas.profile import Profile as ProfileSchema
from app.schemas.common import PaginatedResponse
from app.core.pagination import paginate_query
from app.services.location import search_users_nearby
import uuid

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[ProfileSchema])
async def search_users(
    min_age: Optional[int] = Query(None),
    max_age: Optional[int] = Query(None),
    ethnicity: Optional[str] = Query(None),
    location: Optional[str] = Query(None), # city name
    position: Optional[str] = Query(None),
    build: Optional[str] = Query(None),
    hiv_status: Optional[str] = Query(None),
    privacy_mode: Optional[str] = Query(None),
    trans_interested: Optional[bool] = Query(None),
    radius_km: Optional[float] = Query(50),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    limit: int = 20,
    cursor: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Profile)
    filters = []

    if ethnicity:
        filters.append(Profile.ethnicity == ethnicity)
    if location:
        filters.append(Profile.location_city.ilike(f"%{location}%"))
    if position:
        filters.append(Profile.position == position)
    if build:
        filters.append(Profile.build == build)
    if hiv_status:
        filters.append(Profile.hiv_status == hiv_status)
    if privacy_mode:
        filters.append(Profile.privacy_mode == privacy_mode)
    if trans_interested is not None:
        filters.append(Profile.is_trans_interested == trans_interested)
    
    # Location-based filtering using Redis if lat/lng provided
    if lat is not None and lng is not None:
        nearby_results = await search_users_nearby(lat, lng, radius_km)
        nearby_ids = [uuid.UUID(res[0]) for res in nearby_results]
        filters.append(Profile.id.in_(nearby_ids))

    if filters:
        query = query.where(and_(*filters))

    return await paginate_query(db, query, Profile, limit, cursor)
