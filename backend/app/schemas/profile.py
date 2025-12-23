from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime

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

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    pass

class Profile(ProfileBase):
    id: uuid.UUID
    last_active: datetime

    class Config:
        from_attributes = True
