from typing import Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

class MediaBase(BaseModel):
    url: str
    storage_path: str
    type: str # IMAGE, VIDEO
    is_primary: bool = False
    is_original: bool = False

class MediaCreate(MediaBase):
    user_id: uuid.UUID

class Media(MediaBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
