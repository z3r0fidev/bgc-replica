from typing import Optional
from pydantic import BaseModel


class NotificationPreferences(BaseModel):
    """User notification preferences."""

    # Email notifications
    email_messages: bool = True
    email_friend_requests: bool = True
    email_profile_views: bool = False
    email_ratings: bool = True
    email_forum_replies: bool = True
    email_mentions: bool = True
    email_promotions: bool = False
    email_newsletter: bool = True

    # Email digest frequency: "instant", "daily", "weekly", "never"
    email_digest_frequency: str = "instant"

    # In-app notifications (for future use)
    push_messages: bool = True
    push_friend_requests: bool = True
    push_profile_views: bool = False
    push_ratings: bool = True
    push_forum_replies: bool = True
    push_mentions: bool = True


class NotificationPreferencesUpdate(BaseModel):
    """Partial update for notification preferences."""

    email_messages: Optional[bool] = None
    email_friend_requests: Optional[bool] = None
    email_profile_views: Optional[bool] = None
    email_ratings: Optional[bool] = None
    email_forum_replies: Optional[bool] = None
    email_mentions: Optional[bool] = None
    email_promotions: Optional[bool] = None
    email_newsletter: Optional[bool] = None
    email_digest_frequency: Optional[str] = None
    push_messages: Optional[bool] = None
    push_friend_requests: Optional[bool] = None
    push_profile_views: Optional[bool] = None
    push_ratings: Optional[bool] = None
    push_forum_replies: Optional[bool] = None
    push_mentions: Optional[bool] = None


class NotificationPreferencesResponse(BaseModel):
    """Response with notification preferences."""

    preferences: NotificationPreferences
    message: str = "Notification preferences retrieved"
