from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import uuid
import re


class UserBase(BaseModel):
    model_config = {"from_attributes": True}

    email: Optional[EmailStr] = None
    name: Optional[str] = None
    image: Optional[str] = None


def validate_password_strength(password: str) -> str:
    """Validate password meets security requirements."""
    if len(password) < 12:
        raise ValueError("Password must be at least 12 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValueError("Password must contain at least one special character")
    return password


class UserCreate(UserBase):
    email: EmailStr
    password: str = Field(min_length=12, pattern=r"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?\":{}|<>]).+$")

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class UserUpdate(UserBase):
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_password_strength(v)
        return v


class UserInDB(UserBase):
    id: uuid.UUID
    is_active: bool
    is_superuser: bool

    class Config:
        from_attributes = True


class User(UserInDB):
    pass
