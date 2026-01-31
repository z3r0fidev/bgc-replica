from typing import Optional, List, Dict
from pydantic import BaseModel, field_validator, computed_field
import uuid
import re
from datetime import datetime, date

class ProfileBase(BaseModel):
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

    @field_validator('birthdate')
    @classmethod
    def validate_age(cls, v: Optional[date]):
        if v:
            today = date.today()
            age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
            if age < 18:
                raise ValueError("Must be at least 18 years old")
        return v

    @field_validator('social_links')
    @classmethod
    def validate_social_links(cls, v: Optional[Dict[str, str]]):
        if not v:
            return v

        patterns = {
            'instagram_url': r'^https://(www\.)?instagram\.com/[\w.]+/?$',
            'x_url': r'^https://(www\.)?(twitter\.com|x\.com)/[\w]+/?$',
            'tiktok_url': r'^https://(www\.)?tiktok\.com/@[\w.]+/?$',
            'website_url': r'^https://[\w.-]+\.[a-z]{2,}(/.*)?$'
        }

        for key, url in v.items():
            if not url:
                continue
            if not url.startswith('https://'):
                raise ValueError(f'{key} must use HTTPS')
            if key in patterns:
                if not re.match(patterns[key], url, re.IGNORECASE):
                    platform = key.replace('_url', '').replace('_', ' ').title()
                    raise ValueError(f'Invalid {platform} URL format')
        return v

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    pass

from app.schemas.user import UserBase

class Profile(ProfileBase):
    id: uuid.UUID
    last_active: datetime
    user: Optional[UserBase] = None

    @computed_field
    @property
    def age(self) -> Optional[int]:
        if not self.birthdate:
            return None
        today = date.today()
        return today.year - self.birthdate.year - ((today.month, today.day) < (self.birthdate.month, self.birthdate.day))

    class Config:
        from_attributes = True
