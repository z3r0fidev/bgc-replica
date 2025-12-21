from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.core.database import get_db
from app.api import deps
from app.models.user import User, Relationship
from app.schemas.social import Relationship as RelationshipSchema
from app.schemas.common import PaginatedResponse
from app.core.pagination import paginate_query
import uuid

router = APIRouter()

@router.post("/favorite/{user_id}", response_model=RelationshipSchema)
async def add_favorite(
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # Check if already favorited
    result = await db.execute(select(Relationship).where(
        and_(
            Relationship.from_user_id == current_user.id,
            Relationship.to_user_id == user_id,
            Relationship.type == "FAVORITE"
        )
    ))
    existing = result.scalars().first()
    if existing:
        return existing

    new_rel = Relationship(
        from_user_id=current_user.id,
        to_user_id=user_id,
        type="FAVORITE",
        status="ACCEPTED" # Favorites are one-way and instant
    )
    db.add(new_rel)
    await db.commit()
    await db.refresh(new_rel)
    return new_rel

@router.post("/friend-request/{user_id}", response_model=RelationshipSchema)
async def send_friend_request(
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # Check existing
    result = await db.execute(select(Relationship).where(
        and_(
            Relationship.from_user_id == current_user.id,
            Relationship.to_user_id == user_id,
            Relationship.type == "FRIEND"
        )
    ))
    existing = result.scalars().first()
    if existing:
        return existing

    new_rel = Relationship(
        from_user_id=current_user.id,
        to_user_id=user_id,
        type="FRIEND",
        status="PENDING"
    )
    db.add(new_rel)
    await db.commit()
    await db.refresh(new_rel)
    return new_rel

@router.post("/friend-request/{user_id}/accept", response_model=RelationshipSchema)
async def accept_friend_request(
    user_id: uuid.UUID, # The user who sent the request
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    result = await db.execute(select(Relationship).where(
        and_(
            Relationship.from_user_id == user_id,
            Relationship.to_user_id == current_user.id,
            Relationship.type == "FRIEND",
            Relationship.status == "PENDING"
        )
    ))
    rel = result.scalars().first()
    if not rel:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    rel.status = "ACCEPTED"
    await db.commit()
    await db.refresh(rel)
    return rel

@router.get("/relationships", response_model=PaginatedResponse[RelationshipSchema])
async def get_my_relationships(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
    cursor: Optional[str] = None
):
    query = select(Relationship).where(
        or_(
            Relationship.from_user_id == current_user.id,
            Relationship.to_user_id == current_user.id
        )
    )
    return await paginate_query(db, query, Relationship, limit, cursor)