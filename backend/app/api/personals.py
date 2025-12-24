from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional, Annotated
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.models.user import User, Profile
from app.schemas.profile import Profile as ProfileSchema
from app.schemas.common import PaginatedResponse
from app.core.pagination import paginate_query

router = APIRouter()

@router.get("/categories")
async def get_categories():
    return [
        {"name": "Reviewed", "slug": "reviewed", "icon": "/assets/personals/icons/reviewed.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "Escort Alligator", "slug": "alligator", "icon": "/assets/personals/icons/alligator.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "AA OK", "slug": "aaok", "icon": "/assets/personals/icons/aaok.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "Uber Over", "slug": "outcall", "icon": "/assets/personals/icons/outcall.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "MILFY", "slug": "milfy", "icon": "/assets/personals/icons/milfy.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "40 UP", "slug": "40up", "icon": "/assets/personals/icons/40Up.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "MAX 80", "slug": "max80", "icon": "/assets/personals/icons/max80.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "24/7", "slug": "open24", "icon": "/assets/personals/icons/open24.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "YOLO", "slug": "yolo", "icon": "/assets/personals/icons/yolo.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "CANDY", "slug": "candy2", "icon": "/assets/personals/icons/candy2.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "CAR FUN", "slug": "carfun", "icon": "/assets/personals/icons/carFun.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "AY PAPI!", "slug": "aypapi", "icon": "/assets/personals/icons/ayPapiBig.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "COOKIES", "slug": "cookies", "icon": "/assets/personals/icons/fortunecookies.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
        {"name": "TRANS-X", "slug": "transx", "icon": "/assets/personals/icons/transX.png", "banner": "/assets/personals/banners/transxHeader.png"},
        {"name": "MAN UP", "slug": "manup", "icon": "/assets/personals/icons/manUp.png", "banner": "/assets/personals/banners/desktopSidePanelHeader.png"},
    ]

@router.get("/listings", response_model=PaginatedResponse[ProfileSchema])
async def get_listings(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    limit: int = 20,
    cursor: Optional[str] = None
):
    query = select(Profile).where(Profile.is_personal == True)
    filters = []
    
    if category:
        # Join with User to check metadata_json for category
        from app.models.user import User
        query = query.join(User, Profile.id == User.id)
        # Using SQLAlchemy JSONB containment check
        filters.append(User.metadata_json["archetype"].astext.ilike(f"%{category}%"))
    
    if city:
        filters.append(Profile.location_city == city)
    if state:
        filters.append(Profile.location_state == state)
        
    if filters:
        query = query.where(and_(*filters))
        
    return await paginate_query(db, query, Profile, limit, cursor)
