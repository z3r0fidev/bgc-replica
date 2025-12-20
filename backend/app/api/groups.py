from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.community import CommunityGroup, GroupMembership, StatusUpdate
from app.schemas.community import GroupSchema, GroupCreate, StatusUpdateSchema
import uuid

router = APIRouter()

@router.get("/", response_model=List[GroupSchema])
async def list_groups(
    db: Annotated[AsyncSession, Depends(get_db)],
    query: Optional[str] = Query(None)
):
    stmt = select(CommunityGroup)
    if query:
        stmt = stmt.where(CommunityGroup.name.ilike(f"%{query}%"))
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=GroupSchema)
async def create_group(
    group_in: GroupCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    new_group = CommunityGroup(
        **group_in.model_dump(),
        owner_id=current_user.id
    )
    db.add(new_group)
    await db.commit()
    await db.refresh(new_group)
    
    # Add owner as first member
    membership = GroupMembership(user_id=current_user.id, group_id=new_group.id, role="OWNER")
    db.add(membership)
    await db.commit()
    
    return new_group

@router.post("/{group_id}/join")
async def join_group(
    group_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # Check if already a member
    stmt = select(GroupMembership).where(
        and_(GroupMembership.user_id == current_user.id, GroupMembership.group_id == group_id)
    )
    result = await db.execute(stmt)
    if result.scalars().first():
        return {"status": "already_member"}
    
    membership = GroupMembership(user_id=current_user.id, group_id=group_id, role="MEMBER")
    db.add(membership)
    await db.commit()
    return {"status": "joined"}

@router.get("/{group_id}/feed", response_model=List[StatusUpdateSchema])
async def get_group_feed(
    group_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # This assumes status updates can be linked to groups. 
    # I need to add group_id to StatusUpdate model if not present.
    # For now, return empty or filter by author memberships (complex)
    # Let's add group_id to StatusUpdate in data-model and model file.
    return []
