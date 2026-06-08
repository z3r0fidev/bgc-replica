"""Schemas for verification badge functionality."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class VerificationRequest(BaseModel):
    """Request to verify a user (admin only)."""

    verification_type: str = Field(..., pattern="^(identity|celebrity|official)$")
    notes: Optional[str] = Field(None, max_length=500)


class VerificationResponse(BaseModel):
    """Verification status response."""

    is_verified: bool
    verified_at: Optional[datetime]
    verification_type: Optional[str]

    class Config:
        from_attributes = True


class VerificationStatusResponse(BaseModel):
    """Full verification status with details."""

    user_id: str
    is_verified: bool
    verified_at: Optional[datetime]
    verification_type: Optional[str]
    verification_notes: Optional[str]

    class Config:
        from_attributes = True
