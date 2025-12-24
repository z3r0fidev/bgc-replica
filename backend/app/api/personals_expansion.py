from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Annotated
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete, desc
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api import deps
from app.models.user import User, Profile
from app.models.social import PersonalPost, PersonalPostFollower, PersonalPostComment
from app.schemas.community import PersonalPostCreate, PersonalPostSchema, PersonalPostCommentCreate, PersonalPostCommentSchema
from app.schemas.common import PaginatedResponse
from app.core.pagination import paginate_query

router = APIRouter()

@router.get("", response_model=PaginatedResponse[PersonalPostSchema])
async def get_personal_posts(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: Optional[str] = Query(None),
    limit: int = 20,
    cursor: Optional[str] = None
):
    """
    Fetch personal posts with pagination and category filtering.
    """
    stmt = select(PersonalPost).options(selectinload(PersonalPost.author)).order_by(desc(PersonalPost.created_at))
    
    if category:
        stmt = stmt.where(PersonalPost.category_slug == category)
        
    return await paginate_query(db, stmt, PersonalPost, limit, cursor)

@router.post("", response_model=PersonalPostSchema, status_code=status.HTTP_201_CREATED)
async def create_personal_post(
    post_in: PersonalPostCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    new_post = PersonalPost(
        author_id=current_user.id,
        category_slug=post_in.category,
        content=post_in.content,
        media_ids=post_in.media_ids
    )
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)
    return new_post

@router.post("/{id}/follow")
async def toggle_follow_post(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # Check if post exists
    post_result = await db.execute(select(PersonalPost).where(PersonalPost.id == id))
    post = post_result.scalars().first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already following
    follow_result = await db.execute(
        select(PersonalPostFollower).where(
            and_(
                PersonalPostFollower.user_id == current_user.id,
                PersonalPostFollower.post_id == id
            )
        )
    )
    existing_follow = follow_result.scalars().first()
    
    if existing_follow:
        await db.delete(existing_follow)
        post.follow_count = max(0, post.follow_count - 1)
        following = False
    else:
        new_follow = PersonalPostFollower(user_id=current_user.id, post_id=id)
        db.add(new_follow)
        post.follow_count += 1
        following = True
        
    await db.commit()
    return {"following": following, "count": post.follow_count}

@router.get("/{id}/comments", response_model=List[PersonalPostCommentSchema])
async def get_post_comments(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Fetch all comments for a post, ordered by creation date.
    """
    stmt = select(PersonalPostComment).where(PersonalPostComment.post_id == id).options(selectinload(PersonalPostComment.author)).order_by(PersonalPostComment.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/{id}/comments", response_model=PersonalPostCommentSchema, status_code=status.HTTP_201_CREATED)
async def create_post_comment(
    id: uuid.UUID,
    comment_in: PersonalPostCommentCreate,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Create a new comment on a post and broadcast via Socket.io.
    """
    # Check if post exists
    post_result = await db.execute(select(PersonalPost).where(PersonalPost.id == id))
    post = post_result.scalars().first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    new_comment = PersonalPostComment(
        post_id=id,
        author_id=current_user.id,
        content=comment_in.content,
        parent_id=comment_in.parent_id
    )
    db.add(new_comment)
    
    # Increment comment count
    post.comment_count += 1
    
    await db.commit()
    await db.refresh(new_comment)
    
    # Broadcast to room via Socket.io (using Redis manager)
    from app.core.socket_config import sio
    comment_data = {
        "id": str(new_comment.id),
        "post_id": str(new_comment.post_id),
        "author_id": str(new_comment.author_id),
        "content": new_comment.content,
        "parent_id": str(new_comment.parent_id) if new_comment.parent_id else None,
        "created_at": new_comment.created_at.isoformat(),
        "author": {
            "id": str(current_user.id),
            "name": current_user.name,
            "image": current_user.image
        }
    }
    await sio.emit("new_comment", comment_data, room=f"post:{id}:comments")
    
    return new_comment
