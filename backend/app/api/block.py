from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.services.block_service import block_service
from app.schemas.block import (
    BlockedUserSchema,
    BlockStatusSchema,
    BlockResponseSchema,
)

router = APIRouter()


@router.post("/{user_id}", response_model=BlockResponseSchema)
async def block_user(
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Block a user. Blocked users cannot:
    - Send you messages
    - View your profile
    - Appear in your search results
    - You won't see their content either
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block yourself",
        )

    # Check if target user exists
    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await block_service.block_user(db, current_user.id, user_id)
    return BlockResponseSchema(success=True, message="User blocked successfully")


@router.delete("/{user_id}", response_model=BlockResponseSchema)
async def unblock_user(
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Unblock a user. This restores normal interaction capabilities.
    """
    removed = await block_service.unblock_user(db, current_user.id, user_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found",
        )
    return BlockResponseSchema(success=True, message="User unblocked successfully")


@router.get("/list", response_model=List[BlockedUserSchema])
async def get_blocked_users(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get list of users you have blocked.
    """
    blocked = await block_service.get_blocked_users(db, current_user.id)
    return blocked


@router.get("/status/{user_id}", response_model=BlockStatusSchema)
async def get_block_status(
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Check block status between you and another user.
    Returns whether either party has blocked the other.
    """
    status = await block_service.get_block_status(db, current_user.id, user_id)
    return status
