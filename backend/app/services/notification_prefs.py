from app.models.user import User
from app.schemas.notification import NotificationPreferences

_DEFAULTS = NotificationPreferences().model_dump()


def should_send_email(user: User, preference_key: str) -> bool:
    """
    Whether `user` should receive an email for the given preference key
    (e.g. "email_messages"). Mirrors the default-merge pattern used by
    app/api/notifications.py's GET/PUT endpoints, so a user who has never
    touched their preferences still gets the same answer this key's
    documented default implies.
    """
    if not user.email:
        return False

    stored = user.notification_preferences or {}
    merged = {**_DEFAULTS, **stored}

    if merged.get("email_digest_frequency") == "never":
        return False

    return bool(merged.get(preference_key, _DEFAULTS.get(preference_key, True)))
