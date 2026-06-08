from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


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


# Password Reset Schemas


class PasswordResetRequest(BaseModel):
    """Request to initiate password reset."""

    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Request to confirm password reset with new password."""

    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
