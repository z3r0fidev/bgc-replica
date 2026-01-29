from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class VerifyEmailRequest(BaseModel):
    """Request to verify email with token."""

    token: str


class ResendVerificationRequest(BaseModel):
    """Request to resend verification email."""

    email: EmailStr


class VerificationResponse(BaseModel):
    """Response for verification operations."""

    success: bool
    message: str


class VerificationStatusResponse(BaseModel):
    """Response for verification status check."""

    email_verified: bool
    verified_at: Optional[datetime] = None
