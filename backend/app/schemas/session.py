from typing import Optional
from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime


class DeviceInfo(BaseModel):
    """Parsed device information."""
    browser: Optional[str] = None
    browser_version: Optional[str] = None
    os: Optional[str] = None
    os_version: Optional[str] = None
    device_type: Optional[str] = None  # desktop, mobile, tablet


class SessionSchema(BaseModel):
    """Schema for a user session."""
    id: uuid.UUID
    device_info: Optional[DeviceInfo] = None
    ip_address: Optional[str] = None
    last_active: Optional[datetime] = None
    created_at: datetime
    expires: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)


class SessionListResponse(BaseModel):
    """Response for listing sessions."""
    sessions: list[SessionSchema]
    total: int


class RevokeSessionResponse(BaseModel):
    """Response for revoking sessions."""
    success: bool
    message: str
    revoked_count: int = 1


class RevokeAllSessionsResponse(BaseModel):
    """Response for revoking all sessions."""
    success: bool
    message: str
    revoked_count: int
