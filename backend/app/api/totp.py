from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.schemas.totp import (
    TOTPSetupResponse,
    TOTPVerifyRequest,
    TOTPEnableResponse,
    TOTPDisableRequest,
    TOTPStatusResponse,
    BackupCodesResponse,
)
from app.services.totp_service import totp_service

router = APIRouter()


@router.get("/status", response_model=TOTPStatusResponse)
async def get_totp_status(
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Get current 2FA status for the user."""
    backup_count = None
    if current_user.totp_enabled and current_user.backup_codes:
        backup_count = len(current_user.backup_codes)

    return TOTPStatusResponse(
        enabled=current_user.totp_enabled,
        backup_codes_remaining=backup_count,
    )


@router.post("/setup", response_model=TOTPSetupResponse)
async def setup_totp(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """
    Initialize 2FA setup. Returns QR code and backup codes.
    User must verify with a code to complete setup.
    """
    if current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled. Disable it first to set up again.",
        )

    secret, qr_code, backup_codes = await totp_service.setup_totp(db, current_user)
    provisioning_uri = totp_service.get_totp_uri(secret, current_user.email)

    return TOTPSetupResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes,
        provisioning_uri=provisioning_uri,
    )


@router.post("/enable", response_model=TOTPEnableResponse)
async def enable_totp(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
    request: TOTPVerifyRequest,
):
    """
    Enable 2FA by verifying a TOTP code.
    Must call /setup first.
    """
    if current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled",
        )

    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup not initiated. Call /setup first.",
        )

    success = await totp_service.enable_totp(db, current_user, request.code)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    return TOTPEnableResponse(
        success=True,
        message="Two-factor authentication enabled successfully",
    )


@router.post("/disable", response_model=TOTPEnableResponse)
async def disable_totp(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
    request: TOTPDisableRequest,
):
    """
    Disable 2FA. Requires a valid TOTP code or backup code.
    """
    if not current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled",
        )

    success = await totp_service.disable_totp(db, current_user, request.code)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    return TOTPEnableResponse(
        success=True,
        message="Two-factor authentication disabled successfully",
    )


@router.post("/backup-codes/regenerate", response_model=BackupCodesResponse)
async def regenerate_backup_codes(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
    request: TOTPVerifyRequest,
):
    """
    Regenerate backup codes. Requires a valid TOTP code.
    Previous backup codes will be invalidated.
    """
    if not current_user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled",
        )

    codes = await totp_service.regenerate_backup_codes(db, current_user, request.code)

    if not codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    return BackupCodesResponse(backup_codes=codes)
