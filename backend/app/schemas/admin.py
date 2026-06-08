"""Admin schemas for user management and moderation."""
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AdminUserListItem(BaseModel):
    """Simplified user data for list views."""

    id: uuid.UUID
    name: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None
    is_active: bool
    is_superuser: bool
    suspended_at: Optional[datetime] = None
    suspended_until: Optional[datetime] = None
    banned_at: Optional[datetime] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminUserDetail(AdminUserListItem):
    """Full user data for detail views."""

    email_verified: Optional[datetime] = None
    suspension_reason: Optional[str] = None
    ban_reason: Optional[str] = None
    totp_enabled: bool = False
    notification_preferences: Optional[dict] = None
    updated_at: datetime

    # Profile info (optional, may not always be present)
    profile_display_name: Optional[str] = None
    profile_location_city: Optional[str] = None
    profile_location_state: Optional[str] = None
    profile_is_verified: bool = False


class UserSearchParams(BaseModel):
    """Parameters for searching/filtering users."""

    query: Optional[str] = Field(None, description="Search by name or email")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    is_superuser: Optional[bool] = Field(None, description="Filter by admin status")
    is_suspended: Optional[bool] = Field(None, description="Filter by suspended status")
    is_banned: Optional[bool] = Field(None, description="Filter by banned status")
    created_after: Optional[datetime] = Field(None, description="Created after date")
    created_before: Optional[datetime] = Field(None, description="Created before date")
    sort_by: str = Field("created_at", description="Sort field")
    sort_order: str = Field("desc", description="Sort order (asc/desc)")
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


class SuspendUserRequest(BaseModel):
    """Request to suspend a user."""

    reason: str = Field(..., min_length=5, max_length=500)
    duration_hours: Optional[int] = Field(
        None, ge=1, le=8760, description="Duration in hours (max 1 year)"
    )


class BanUserRequest(BaseModel):
    """Request to ban a user."""

    reason: str = Field(..., min_length=5, max_length=500)


class AdminActionLogItem(BaseModel):
    """Admin action log entry."""

    id: uuid.UUID
    admin_id: Optional[uuid.UUID] = None
    admin_name: Optional[str] = None
    target_user_id: Optional[uuid.UUID] = None
    target_user_name: Optional[str] = None
    action: str
    reason: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminActionLogResponse(BaseModel):
    """Paginated list of admin action logs."""

    items: List[AdminActionLogItem]
    total: int
    limit: int
    offset: int


class AdminUserListResponse(BaseModel):
    """Paginated list of users."""

    items: List[AdminUserListItem]
    total: int
    limit: int
    offset: int


class AdminStatsOverview(BaseModel):
    """Overview statistics for admin dashboard."""

    total_users: int
    active_users: int
    suspended_users: int
    banned_users: int
    admin_users: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int


class UpdateUserRequest(BaseModel):
    """Request to update user fields."""

    name: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
