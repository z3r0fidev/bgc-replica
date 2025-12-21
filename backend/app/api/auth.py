from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, User as UserSchema
from app.api import deps

from fastapi_limiter.depends import RateLimiter



router = APIRouter()



@router.post("/login", response_model=Token, dependencies=[Depends(RateLimiter(times=5, seconds=60))])

async def login(

    db: Annotated[AsyncSession, Depends(get_db)],

    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]

):

    result = await db.execute(select(User).where(User.email == form_data.username))

    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Incorrect email or password",

        )

    return Token(

        access_token=create_access_token(user.id),

        token_type="bearer",

    )





@router.post("/register", response_model=UserSchema, dependencies=[Depends(RateLimiter(times=3, seconds=3600))])

async def register(

    db: Annotated[AsyncSession, Depends(get_db)],

    user_in: UserCreate

):
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists",
        )
    
    new_user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/logout")
async def logout():
    # Since we use JWT, logout is primarily handled on the client by deleting the token.
    # If using Redis sessions, we would invalidate the token here.
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserSchema)
async def get_me(current_user: Annotated[User, Depends(deps.get_current_user)]):
    return current_user
