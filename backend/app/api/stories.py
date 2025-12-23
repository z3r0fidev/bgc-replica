from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.api import deps
from app.models.user import User, Story
from app.schemas.story import Story as StorySchema, StoryCreate, StoryUpdate
from app.schemas.common import PaginatedResponse
from app.core.pagination import paginate_query
import uuid

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[StorySchema])
async def get_stories(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
    cursor: Optional[str] = None
):
    """
    Fetch all user-generated stories.
    """
    stmt = select(Story).order_by(desc(Story.created_at))
    return await paginate_query(db, stmt, Story, limit, cursor)

@router.post("/", response_model=StorySchema, status_code=status.HTTP_201_CREATED)
async def create_story(
    story_in: StoryCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Create a new story.
    """
    new_story = Story(
        **story_in.model_dump(),
        user_id=current_user.id
    )
    db.add(new_story)
    await db.commit()
    await db.refresh(new_story)
    return new_story

@router.get("/{story_id}", response_model=StorySchema)
async def get_story(
    story_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Get a specific story by ID.
    """
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story

@router.put("/{story_id}", response_model=StorySchema)
async def update_story(
    story_id: uuid.UUID,
    story_in: StoryUpdate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Update a story owned by the current user.
    """
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    update_data = story_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(story, field, value)
    
    await db.commit()
    await db.refresh(story)
    return story

@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_story(
    story_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Delete a story owned by the current user.
    """
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    await db.delete(story)
    await db.commit()
    return None
