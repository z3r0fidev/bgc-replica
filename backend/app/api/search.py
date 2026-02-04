from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.models.user import User, Profile
from app.schemas.profile import Profile as ProfileSchema
from app.schemas.common import PaginatedResponse
from app.core.pagination import paginate_query
from app.services.location import search_users_nearby, get_lat_lng_from_zip
from app.services.block_service import block_service
from app.api import deps
from fastapi_limiter.depends import RateLimiter
import uuid

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[ProfileSchema],
    dependencies=[Depends(RateLimiter(times=30, seconds=60))],
)
async def search_users(
    min_age: Optional[int] = Query(None),
    max_age: Optional[int] = Query(None),
    ethnicity: Optional[str] = Query(None),
    location: Optional[str] = Query(None),  # city name
    zipcode: Optional[str] = Query(None),
    position: Optional[str] = Query(None),
    build: Optional[str] = Query(None),
    hiv_status: Optional[str] = Query(None),
    privacy_mode: Optional[str] = Query(None),
    trans_interested: Optional[bool] = Query(None),
    # Profile expansion filters
    relationship_status: Optional[str] = Query(None),
    looking_for: Optional[List[str]] = Query(None),
    industry: Optional[str] = Query(None),
    gender_identity: Optional[str] = Query(None),
    # Location filters
    radius_km: Optional[float] = Query(50),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    limit: int = 20,
    cursor: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional),
):
    from sqlalchemy.orm import selectinload

    query = select(Profile).options(selectinload(Profile.user))
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

    # Profile expansion filters
    if relationship_status:
        filters.append(Profile.relationship_status == relationship_status)
    if looking_for:
        # Array overlap for multi-select matching (PostgreSQL)
        filters.append(Profile.looking_for.overlap(looking_for))
    if industry:
        filters.append(Profile.industry == industry)
    if gender_identity:
        filters.append(Profile.gender_identity == gender_identity)

    # Handle Zipcode
    if zipcode and lat is None and lng is None:
        zip_coords = get_lat_lng_from_zip(zipcode)
        if zip_coords:
            lat = zip_coords["lat"]
            lng = zip_coords["lng"]

    # Location-based filtering using Redis if lat/lng provided
    if lat is not None and lng is not None:
        nearby_results = await search_users_nearby(lat, lng, radius_km)
        nearby_ids = [uuid.UUID(res[0]) for res in nearby_results]
        filters.append(Profile.id.in_(nearby_ids))

    # Filter out blocked users (bidirectional)
    if current_user:
        block_ids = await block_service.get_block_ids(db, current_user.id)
        if block_ids:
            filters.append(~Profile.id.in_(block_ids))

    if filters:
        query = query.where(and_(*filters))

    return await paginate_query(db, query, Profile, limit, cursor)
