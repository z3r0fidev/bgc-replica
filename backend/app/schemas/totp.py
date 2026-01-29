from typing import List, Optional

from pydantic import BaseModel, field_validator


class TOTPSetupResponse(BaseModel):
    """Response for TOTP setup initiation."""

    secret: str
    qr_code: str  # Base64 encoded PNG
    backup_codes: List[str]
    provisioning_uri: str


class TOTPVerifyRequest(BaseModel):
    """Request to verify TOTP code."""

    code: str

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        # Remove spaces and dashes
        v = v.replace(" ", "").replace("-", "")
        if not v.isalnum():
            raise ValueError("Code must contain only letters and numbers")
        return v


class TOTPEnableResponse(BaseModel):
    """Response after enabling TOTP."""

    success: bool
    message: str


class TOTPDisableRequest(BaseModel):
    """Request to disable TOTP."""

    code: str  # TOTP code or backup code


class TOTPStatusResponse(BaseModel):
    """Response for 2FA status check."""

    enabled: bool
    backup_codes_remaining: Optional[int] = None


class BackupCodesResponse(BaseModel):
    """Response with regenerated backup codes."""

    backup_codes: List[str]


class TwoFactorLoginRequest(BaseModel):
    """Request for 2FA verification during login."""

    user_id: str
    code: str

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        v = v.replace(" ", "").replace("-", "")
        if not v.isalnum():
            raise ValueError("Code must contain only letters and numbers")
        return v
