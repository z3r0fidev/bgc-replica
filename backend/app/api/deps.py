from typing import Annotated, Optional
import uuid
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[Optional[str], Depends(oauth2_scheme)] = None,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Try getting token from Bearer header
    # (FastAPI's oauth2_scheme already extracts it if present)

    # 2. Try getting token from cookie (NextAuth)
    if not token:
        token = request.cookies.get("next-auth.session-token") or request.cookies.get(
            "__Secure-next-auth.session-token"
        )

    if not token:
        raise credentials_exception

    try:
        # Use NEXTAUTH_SECRET if it looks like a NextAuth token, otherwise SECRET_KEY
        secret = (
            settings.NEXTAUTH_SECRET
            if settings.NEXTAUTH_SECRET
            else settings.SECRET_KEY
        )
        payload = jwt.decode(token, secret, algorithms=[settings.ALGORITHM])

        # NextAuth often puts the user ID in 'sub' or 'user.id'
        user_id_str: str = payload.get("sub") or payload.get("user", {}).get("id")

        if user_id_str is None:
            raise credentials_exception

        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_optional(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[Optional[str], Depends(oauth2_scheme)] = None,
) -> Optional[User]:
    try:
        return await get_current_user(request, db, token)
    except HTTPException:
        return None


async def get_verified_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Dependency that requires the current user to have a verified email.
    Use this for features that require email verification.
    """
    if current_user.email_verified is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required to access this feature",
        )
    return current_user


async def get_admin_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Dependency that requires the current user to be a superuser/admin.
    Use this for admin-only endpoints.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    # Check if user is banned or suspended
    if current_user.banned_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is banned",
        )
    return current_user
