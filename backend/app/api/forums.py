from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.community import ForumCategory, ForumThread, ForumPost
from app.schemas.community import (
    ForumCategorySchema,
    ForumThreadSchema,
    ForumPostSchema,
    ForumThreadCreate,
    ForumPostCreate,
    ForumCategoryTree,
)
from app.schemas.common import PaginatedResponse
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Duration, Limiter, Rate
import uuid

router = APIRouter()


@router.get("/tree", response_model=List[ForumCategoryTree])
async def get_forum_tree(db: Annotated[AsyncSession, Depends(get_db)]):
    # Fetch all categories
    result = await db.execute(select(ForumCategory))
    categories = result.scalars().all()

    # Build tree in memory (suitable for small/medium number of categories)
    category_map = {cat.id: ForumCategoryTree.model_validate(cat) for cat in categories}
    tree = []

    for cat_id, cat_obj in category_map.items():
        if cat_obj.parent_id:
            parent = category_map.get(cat_obj.parent_id)
            if parent:
                parent.children.append(cat_obj)
        else:
            tree.append(cat_obj)

    return tree


@router.get("/categories", response_model=List[ForumCategorySchema])
async def get_categories(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(ForumCategory))
    return result.scalars().all()


@router.get(
    "/categories/{category_slug}/threads",
    response_model=PaginatedResponse[ForumThreadSchema],
)
async def get_category_threads(
    category_slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(20, ge=1, le=200),
    cursor: Optional[str] = None,
):
    cat_result = await db.execute(
        select(ForumCategory).where(ForumCategory.slug == category_slug)
    )
    category = cat_result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    from sqlalchemy.orm import selectinload

    stmt = (
        select(ForumThread)
        .where(ForumThread.category_id == category.id)
        .options(selectinload(ForumThread.author))
    )

    # Apply pagination
    from app.core.pagination import paginate_query

    return await paginate_query(
        db, stmt, ForumThread, limit, cursor, cursor_attribute="last_activity"
    )


@router.post(
    "/threads",
    response_model=ForumThreadSchema,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(20, Duration.MINUTE * 5))))],
)
async def create_thread(
    thread_in: ForumThreadCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    new_thread = ForumThread(**thread_in.model_dump(), author_id=current_user.id)
    db.add(new_thread)
    await db.commit()
    await db.refresh(new_thread)
    return new_thread


@router.get("/threads/{thread_id}/posts", response_model=List[ForumPostSchema])
async def get_thread_posts(
    thread_id: uuid.UUID, db: Annotated[AsyncSession, Depends(get_db)]
):
    # Fetch all posts for the thread and organize them hierarchically in frontend or here
    # For now, return flat list ordered by date
    stmt = (
        select(ForumPost)
        .where(ForumPost.thread_id == thread_id)
        .order_by(ForumPost.created_at)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/posts",
    response_model=ForumPostSchema,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(40, Duration.MINUTE))))],
)
async def create_post(
    post_in: ForumPostCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    new_post = ForumPost(**post_in.model_dump(), author_id=current_user.id)
    db.add(new_post)

    # Update parent thread's last activity
    stmt = select(ForumThread).where(ForumThread.id == post_in.thread_id)
    result = await db.execute(stmt)
    thread = result.scalars().first()
    if thread:
        from datetime import datetime

        thread.last_activity = datetime.utcnow()

    await db.commit()
    await db.refresh(new_post)
    return new_post
