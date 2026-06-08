from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.services.session_service import session_service
from app.schemas.session import (
    SessionSchema,
    SessionListResponse,
    RevokeSessionResponse,
    RevokeAllSessionsResponse,
    DeviceInfo,
)

router = APIRouter()


def get_current_session_token(request: Request) -> str | None:
    """Extract current session token from request."""
    # Try cookie first (NextAuth)
    token = request.cookies.get("next-auth.session-token") or request.cookies.get(
        "__Secure-next-auth.session-token"
    )
    # Fall back to Bearer token
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    return token


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    request: Request,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    List all active sessions for the current user.
    The current session is marked with is_current=True.
    """
    current_token = get_current_session_token(request)
    sessions, total = await session_service.get_user_sessions(
        db, current_user.id, current_token
    )

    # Convert to response schema
    session_list = []
    for s in sessions:
        device_info = None
        if s["device_info"]:
            device_info = DeviceInfo(**s["device_info"])

        session_list.append(
            SessionSchema(
                id=s["id"],
                device_info=device_info,
                ip_address=s["ip_address"],
                last_active=s["last_active"],
                created_at=s["created_at"],
                expires=s["expires"],
                is_current=s["is_current"],
            )
        )

    return SessionListResponse(sessions=session_list, total=total)


@router.delete("/{session_id}", response_model=RevokeSessionResponse)
async def revoke_session(
    session_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Revoke a specific session.
    Cannot revoke the current session (use logout instead).
    """
    current_token = get_current_session_token(request)
    revoked = await session_service.revoke_session(
        db, current_user.id, session_id, current_token
    )

    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session not found or cannot revoke current session",
        )

    return RevokeSessionResponse(
        success=True,
        message="Session revoked successfully",
        revoked_count=1,
    )


@router.delete("", response_model=RevokeAllSessionsResponse)
async def revoke_all_sessions(
    request: Request,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Revoke all sessions except the current one.
    This is useful for security when you suspect unauthorized access.
    """
    current_token = get_current_session_token(request)
    revoked_count = await session_service.revoke_all_sessions(
        db, current_user.id, current_token
    )

    return RevokeAllSessionsResponse(
        success=True,
        message=f"Revoked {revoked_count} session(s)",
        revoked_count=revoked_count,
    )
