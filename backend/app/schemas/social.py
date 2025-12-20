from typing import Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

class RelationshipBase(BaseModel):
    to_user_id: uuid.UUID
    type: str # FRIEND, FAVORITE, BLOCKED

class RelationshipCreate(RelationshipBase):
    status: str = "PENDING"

class RelationshipUpdate(BaseModel):
    status: str

class Relationship(RelationshipBase):
    id: uuid.UUID
    from_user_id: uuid.UUID
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProfileRatingBase(BaseModel):
    to_user_id: uuid.UUID
    score: int # 1-10

class ProfileRatingCreate(ProfileRatingBase):
    pass

class ProfileRating(ProfileRatingBase):
    from_user_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
