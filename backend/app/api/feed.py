from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.api import deps
from app.models.user import User, Relationship
from app.models.community import StatusUpdate, PostComment
from app.schemas.community import (
    StatusUpdateSchema, StatusUpdateCreate,
    PostCommentSchema, PostCommentCreate
)
from app.services.feed_service import feed_service
import uuid

from app.schemas.common import PaginatedResponse
from app.core.pagination import encode_cursor, decode_cursor
import time

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[StatusUpdateSchema])
async def get_feed(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    feed_type: str = Query("global", pattern="^(global|following)$"),
    limit: int = 20,
    cursor: Optional[str] = None
):
    user_id = current_user.id if feed_type == "following" else None
    
    # Decode cursor (it's a base64 encoded ISO timestamp, but for Redis we want float)
    dt_cursor = decode_cursor(cursor)
    float_cursor = dt_cursor.timestamp() if dt_cursor else None
    
    post_ids = await feed_service.get_feed(user_id=user_id, limit=limit, cursor=float_cursor)
    
    if not post_ids:
        return {
            "items": [],
            "metadata": {"has_next": False, "next_cursor": None, "count": 0}
        }
    
    has_next = len(post_ids) > limit
    page_ids = post_ids[:limit]
    
    # Convert string IDs back to UUIDs
    post_uuids = [uuid.UUID(pid) for pid in page_ids]
    
    # Fetch actual objects from DB
    # We want to maintain the order from Redis
    stmt = (
        select(StatusUpdate)
        .where(StatusUpdate.id.in_(post_uuids))
        .options(selectinload(StatusUpdate.author))
    )
    result = await db.execute(stmt)
    updates = {u.id: u for u in result.scalars().all()}
    
    # Re-order
    items = [updates[pid] for pid in post_uuids if pid in updates]
    
    # Get next cursor from the last item
    next_cursor = None
    if has_next and items:
        # We need the score of the LAST item in page_ids to use as next cursor
        # But wait, Redis returned them in order.
        # I'll just use the created_at of the last item in 'items'
        next_cursor = encode_cursor(items[-1].created_at)

    return {
        "items": items,
        "metadata": {
            "has_next": has_next,
            "next_cursor": next_cursor,
            "count": len(items)
        }
    }

from app.services.tasks import fan_out_post

@router.post("/", response_model=StatusUpdateSchema)
async def create_status_update(
    update_in: StatusUpdateCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    new_update = StatusUpdate(
        **update_in.model_dump(),
        author_id=current_user.id
    )
    db.add(new_update)
    await db.commit()
    await db.refresh(new_update)
    
    # Fan-out in background via Celery
    # 1. Get follower IDs
    stmt = select(Relationship.from_user_id).where(
        Relationship.to_user_id == current_user.id,
        Relationship.type == "FRIEND",
        Relationship.status == "ACCEPTED"
    )
    result = await db.execute(stmt)
    follower_ids = result.scalars().all()
    
    # Convert UUIDs to strings for Celery (JSON serializable)
    fan_out_post.delay(
        post_id_str=str(new_update.id),
        follower_ids_str=[str(fid) for fid in follower_ids]
    )
    
    return new_update

@router.get("/{post_id}/comments", response_model=List[PostCommentSchema])
async def get_post_comments(
    post_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    stmt = select(PostComment).where(PostComment.post_id == post_id).order_by(PostComment.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/{post_id}/comments", response_model=PostCommentSchema)
async def create_post_comment(
    post_id: uuid.UUID,
    comment_in: PostCommentCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    new_comment = PostComment(
        **comment_in.model_dump(),
        post_id=post_id,
        author_id=current_user.id
    )
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    return new_comment
