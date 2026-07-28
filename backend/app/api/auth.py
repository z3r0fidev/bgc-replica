from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, User as UserSchema, UsernameUpdate
from app.schemas.verification import (
    VerifyEmailRequest,
    ResendVerificationRequest,
    VerificationResponse,
    VerificationStatusResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from app.schemas.totp import TwoFactorLoginRequest
from app.services.verification_service import verification_service
from app.services.password_reset_service import password_reset_service
from app.services.totp_service import totp_service
from app.services.audit_service import audit_service, AuditAction
from app.services.tasks import (
    send_verification_email_task,
    send_password_reset_email_task,
)
from app.api import deps

from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Duration, Limiter, Rate


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


router = APIRouter()


@router.post("/login", dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(30, Duration.MINUTE))))])
async def login(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")[:512]

    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()

    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        # Log failed login attempt
        await audit_service.log(
            db,
            AuditAction.LOGIN_FAILED,
            user_id=user.id if user else None,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            event_metadata={"email": form_data.username},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Check if 2FA is enabled
    if user.totp_enabled:
        await audit_service.log(
            db,
            AuditAction.LOGIN_2FA_REQUIRED,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return {
            "requires_2fa": True,
            "user_id": str(user.id),
            "message": "Two-factor authentication required",
        }

    # Log successful login
    await audit_service.log(
        db,
        AuditAction.LOGIN_SUCCESS,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return Token(
        access_token=create_access_token(user.id),
        token_type="bearer",
    )


@router.post(
    "/login/2fa",
    response_model=Token,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(30, Duration.MINUTE))))],
)
async def login_2fa(
    http_request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    request: TwoFactorLoginRequest,
):
    """Complete login with 2FA verification."""
    import uuid as uuid_module

    ip_address = get_client_ip(http_request)
    user_agent = http_request.headers.get("User-Agent", "")[:512]

    try:
        user_id = uuid_module.UUID(request.user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled for this account",
        )

    # Verify 2FA code
    if not await totp_service.verify_2fa(db, user, request.code):
        await audit_service.log(
            db,
            AuditAction.LOGIN_2FA_FAILED,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code",
        )

    # Log successful 2FA login
    await audit_service.log(
        db,
        AuditAction.LOGIN_2FA_SUCCESS,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return Token(
        access_token=create_access_token(user.id),
        token_type="bearer",
    )


@router.post(
    "/register",
    response_model=UserSchema,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(30, Duration.HOUR))))],
)
async def register(
    request: Request, db: Annotated[AsyncSession, Depends(get_db)], user_in: UserCreate
):
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")[:512]

    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists",
        )

    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    new_user = User(
        email=user_in.email,
        username=user_in.username,
        name=user_in.name,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Log registration
    await audit_service.log(
        db,
        AuditAction.REGISTER,
        user_id=new_user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # Create verification token and send email
    token = await verification_service.create_verification_token(db, user_in.email)
    send_verification_email_task.delay(
        to_email=user_in.email,
        token=token,
        user_name=user_in.name,
    )

    return new_user


@router.post("/logout")
async def logout():
    # Since we use JWT, logout is primarily handled on the client by deleting the token.
    # If using Redis sessions, we would invalidate the token here.
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserSchema)
async def get_me(current_user: Annotated[User, Depends(deps.get_current_user)]):
    return current_user


@router.patch("/username", response_model=UserSchema)
async def update_username(
    payload: UsernameUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(User).where(User.username == payload.username, User.id != current_user.id)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    current_user.username = payload.username
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/verify-email", response_model=VerificationResponse)
async def verify_email(
    db: Annotated[AsyncSession, Depends(get_db)],
    request: VerifyEmailRequest,
):
    """Verify email with token from verification link."""
    email = await verification_service.verify_token(db, request.token)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    user = await verification_service.mark_email_verified(db, email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return VerificationResponse(
        success=True,
        message="Email verified successfully",
    )


@router.post(
    "/resend-verification",
    response_model=VerificationResponse,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(5, Duration.MINUTE))))],
)
async def resend_verification(
    db: Annotated[AsyncSession, Depends(get_db)],
    request: ResendVerificationRequest,
):
    """
    Resend verification email.
    Rate limited to 1 request per minute.
    Does not reveal if email exists for security.
    """
    # Check if user exists
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalars().first()

    # Always return success to prevent email enumeration
    if not user:
        return VerificationResponse(
            success=True,
            message="If that email exists, a verification link has been sent",
        )

    # Check if already verified
    if user.email_verified:
        return VerificationResponse(
            success=True,
            message="Email is already verified",
        )

    # Check rate limit (in addition to FastAPI limiter, check last sent time)
    last_sent = await verification_service.get_last_verification_sent(db, request.email)
    if last_sent:
        time_since = datetime.utcnow() - last_sent
        if time_since < timedelta(minutes=1):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting another verification email",
            )

    # Create new token and send email
    token = await verification_service.create_verification_token(db, request.email)
    send_verification_email_task.delay(
        to_email=request.email,
        token=token,
        user_name=user.name,
    )

    return VerificationResponse(
        success=True,
        message="If that email exists, a verification link has been sent",
    )


@router.get("/verification-status", response_model=VerificationStatusResponse)
async def get_verification_status(
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Check if current user's email is verified."""
    return VerificationStatusResponse(
        email_verified=current_user.email_verified is not None,
        verified_at=current_user.email_verified,
    )


# Password Reset Endpoints


@router.post(
    "/forgot-password",
    response_model=VerificationResponse,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(10, Duration.MINUTE * 5))))],
)
async def forgot_password(
    db: Annotated[AsyncSession, Depends(get_db)],
    request: PasswordResetRequest,
):
    """
    Request password reset email.
    Rate limited to 3 requests per 5 minutes.
    Does not reveal if email exists for security.
    """
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalars().first()

    # Always return success to prevent email enumeration
    if not user:
        return VerificationResponse(
            success=True,
            message="If that email exists, a password reset link has been sent",
        )

    # Check if user has a password (not OAuth-only)
    if not user.hashed_password:
        return VerificationResponse(
            success=True,
            message="If that email exists, a password reset link has been sent",
        )

    # Check rate limit
    last_request = await password_reset_service.get_last_reset_request(
        db, request.email
    )
    if last_request:
        time_since = datetime.utcnow() - last_request
        if time_since < timedelta(minutes=5):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting another password reset",
            )

    # Create reset token and send email
    token = await password_reset_service.create_reset_token(db, request.email)
    send_password_reset_email_task.delay(
        to_email=request.email,
        token=token,
        user_name=user.name,
    )

    return VerificationResponse(
        success=True,
        message="If that email exists, a password reset link has been sent",
    )


@router.post("/reset-password", response_model=VerificationResponse)
async def reset_password(
    db: Annotated[AsyncSession, Depends(get_db)],
    request: PasswordResetConfirm,
):
    """Reset password with token from email."""
    email = await password_reset_service.verify_reset_token(db, request.token)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user = await password_reset_service.reset_password(db, email, request.new_password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return VerificationResponse(
        success=True,
        message="Password reset successfully",
    )
