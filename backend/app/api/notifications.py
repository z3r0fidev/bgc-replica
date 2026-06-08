from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.schemas.notification import (
    NotificationPreferences,
    NotificationPreferencesUpdate,
    NotificationPreferencesResponse,
)

router = APIRouter()

# Default notification preferences
DEFAULT_PREFERENCES = NotificationPreferences().model_dump()


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get current user's notification preferences."""
    # Get stored preferences or use defaults
    stored = current_user.notification_preferences or {}
    merged = {**DEFAULT_PREFERENCES, **stored}

    return NotificationPreferencesResponse(
        preferences=NotificationPreferences(**merged),
        message="Notification preferences retrieved",
    )


@router.put("/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    preferences: NotificationPreferencesUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update notification preferences (full or partial update)."""
    # Get current preferences
    current = current_user.notification_preferences or {}
    merged = {**DEFAULT_PREFERENCES, **current}

    # Apply updates (only non-None values)
    update_data = preferences.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            merged[key] = value

    # Validate email_digest_frequency
    valid_frequencies = ["instant", "daily", "weekly", "never"]
    if merged.get("email_digest_frequency") not in valid_frequencies:
        merged["email_digest_frequency"] = "instant"

    # Save to database
    current_user.notification_preferences = merged
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return NotificationPreferencesResponse(
        preferences=NotificationPreferences(**merged),
        message="Notification preferences updated",
    )


@router.post("/preferences/reset", response_model=NotificationPreferencesResponse)
async def reset_notification_preferences(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Reset notification preferences to defaults."""
    current_user.notification_preferences = DEFAULT_PREFERENCES
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return NotificationPreferencesResponse(
        preferences=NotificationPreferences(**DEFAULT_PREFERENCES),
        message="Notification preferences reset to defaults",
    )


@router.put("/preferences/email-all")
async def toggle_all_email_notifications(
    enabled: bool,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Enable or disable all email notifications at once."""
    current = current_user.notification_preferences or {}
    merged = {**DEFAULT_PREFERENCES, **current}

    # Toggle all email-related settings
    email_keys = [
        "email_messages",
        "email_friend_requests",
        "email_profile_views",
        "email_ratings",
        "email_forum_replies",
        "email_mentions",
        "email_promotions",
        "email_newsletter",
    ]

    for key in email_keys:
        merged[key] = enabled

    # If disabling all, set digest to never
    if not enabled:
        merged["email_digest_frequency"] = "never"

    current_user.notification_preferences = merged
    db.add(current_user)
    await db.commit()

    return {
        "status": "success",
        "message": f"All email notifications {'enabled' if enabled else 'disabled'}",
        "preferences": merged,
    }
