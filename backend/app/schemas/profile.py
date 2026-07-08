from typing import Optional, List, Dict
from pydantic import field_validator, computed_field
import uuid
import re
from datetime import datetime, date
from app.schemas.base import SafeBaseModel, _assert_safe_string


class ProfileBase(SafeBaseModel):
    bio: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[int] = None
    ethnicity: Optional[str] = None
    body_type: Optional[str] = None
    roles: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    privacy_level: str = "PUBLIC"

    # Advanced Attributes
    position: Optional[str] = None
    build: Optional[str] = None
    hiv_status: Optional[str] = None
    privacy_mode: str = "OUT"
    is_trans_interested: bool = False

    # Social Expansion Fields
    display_name: Optional[str] = None
    pronouns: Optional[str] = None
    birthdate: Optional[date] = None
    gender_identity: Optional[str] = None
    relationship_status: Optional[str] = None
    looking_for: Optional[List[str]] = None
    occupation: Optional[str] = None
    industry: Optional[str] = None
    education_level: Optional[str] = None
    university: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    privacy_settings: Optional[Dict[str, str]] = None

    @field_validator("birthdate")
    @classmethod
    def validate_age(cls, v: Optional[date]):
        if v:
            today = date.today()
            age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
            if age < 18:
                raise ValueError("Must be at least 18 years old")
        return v

    @field_validator("social_links")
    @classmethod
    def validate_social_links(cls, v: Optional[Dict[str, str]]):
        if not v:
            return v

        patterns = {
            "instagram_url": r"^https://(www\.)?instagram\.com/[\w.]+/?$",
            "x_url": r"^https://(www\.)?(twitter\.com|x\.com)/[\w]+/?$",
            "tiktok_url": r"^https://(www\.)?tiktok\.com/@[\w.]+/?$",
            "website_url": r"^https://[\w.-]+\.[a-z]{2,}(/.*)?$",
        }

        for key, url in v.items():
            _assert_safe_string(key)
            if not url:
                continue
            _assert_safe_string(url)
            if not url.startswith("https://"):
                raise ValueError(f"{key} must use HTTPS")
            if key in patterns:
                if not re.match(patterns[key], url, re.IGNORECASE):
                    platform = key.replace("_url", "").replace("_", " ").title()
                    raise ValueError(f"Invalid {platform} URL format")
        return v

    @field_validator("looking_for", "roles", "interests", mode="before")
    @classmethod
    def validate_string_lists(cls, v):
        if v is None:
            return v
        if not isinstance(v, list):
            return v
        return [_assert_safe_string(item) if isinstance(item, str) else item for item in v]


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


from app.schemas.user import UserBase


class CompletionTip(SafeBaseModel):
    """A suggestion for completing a profile field."""
    field: str
    label: str
    category: str  # "critical", "important", "nice_to_have"
    tab: str  # Tab name in the edit form: "basics", "identity", "lifestyle", "professional", "social"
    weight: float  # How much this field contributes to completion
    quick_win: bool = False  # True if this is easy to fill in


class MilestoneStatus(SafeBaseModel):
    """Status of a gamification milestone."""
    level: int
    name: str  # "Beginner", "Explorer", "Socialite", "Complete"
    threshold: int  # Percentage required
    reached: bool
    badge_icon: str  # Icon name: "seedling", "compass", "star", "trophy"


class FeatureUnlock(SafeBaseModel):
    """A feature that unlocks at a certain completion level."""
    threshold: int
    name: str
    description: str
    unlocked: bool


class ProfileCompletionResponse(SafeBaseModel):
    """Complete profile completion data with gamification."""
    percentage: int  # 0-100 (inflated from 20% base)
    raw_percentage: int  # Actual calculated percentage
    critical_filled: int
    critical_total: int
    important_filled: int
    important_total: int
    nice_to_have_filled: int
    nice_to_have_total: int
    suggestions: List[CompletionTip]  # Top 5 quick wins
    milestones: List[MilestoneStatus]
    current_milestone: str
    next_milestone: Optional[str] = None
    status_label: str  # "Incomplete"/"Basic"/"Social"/"Robust"
    feature_unlocks: List[FeatureUnlock]


class Profile(ProfileBase):
    id: uuid.UUID
    last_active: datetime
    user: Optional[UserBase] = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def age(self) -> Optional[int]:
        if not self.birthdate:
            return None
        today = date.today()
        return (
            today.year
            - self.birthdate.year
            - ((today.month, today.day) < (self.birthdate.month, self.birthdate.day))
        )

    class Config:
        from_attributes = True
