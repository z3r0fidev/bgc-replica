"""API endpoints for verification badge management."""
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User, Profile
from app.api import deps
from app.schemas.verification_badge import (
    VerificationRequest,
    VerificationResponse,
    VerificationStatusResponse,
)

router = APIRouter()


async def require_admin(
    current_user: Annotated[User, Depends(deps.get_current_user)]
) -> User:
    """Require that the current user is a superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


@router.get("/{user_id}", response_model=VerificationResponse)
async def get_verification_status(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get verification status for a user (public endpoint)."""
    result = await db.execute(
        select(Profile).where(Profile.id == user_id)
    )
    profile = result.scalars().first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return VerificationResponse(
        is_verified=profile.is_verified,
        verified_at=profile.verified_at,
        verification_type=profile.verification_type,
    )


@router.post("/{user_id}", response_model=VerificationStatusResponse)
async def verify_user(
    user_id: uuid.UUID,
    verification_in: VerificationRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Verify a user (admin only)."""
    result = await db.execute(
        select(Profile).where(Profile.id == user_id)
    )
    profile = result.scalars().first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    profile.is_verified = True
    profile.verified_at = datetime.utcnow()
    profile.verification_type = verification_in.verification_type
    profile.verification_notes = verification_in.notes

    await db.commit()
    await db.refresh(profile)

    return VerificationStatusResponse(
        user_id=str(user_id),
        is_verified=profile.is_verified,
        verified_at=profile.verified_at,
        verification_type=profile.verification_type,
        verification_notes=profile.verification_notes,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_verification(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Revoke verification from a user (admin only)."""
    result = await db.execute(
        select(Profile).where(Profile.id == user_id)
    )
    profile = result.scalars().first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    profile.is_verified = False
    profile.verified_at = None
    profile.verification_type = None
    profile.verification_notes = None

    await db.commit()


@router.get("/{user_id}/details", response_model=VerificationStatusResponse)
async def get_verification_details(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Get full verification details including notes (admin only)."""
    result = await db.execute(
        select(Profile).where(Profile.id == user_id)
    )
    profile = result.scalars().first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return VerificationStatusResponse(
        user_id=str(user_id),
        is_verified=profile.is_verified,
        verified_at=profile.verified_at,
        verification_type=profile.verification_type,
        verification_notes=profile.verification_notes,
    )
