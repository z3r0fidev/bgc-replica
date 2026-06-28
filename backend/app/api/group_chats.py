"""API endpoints for group chat functionality."""

import uuid
from typing import Annotated, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Duration, Limiter, Rate

from app.core.database import get_db
from app.models.user import User
from app.models.chat import GroupChat, GroupMember, GroupMessage
from app.api import deps
from app.schemas.group_chat import (
    GroupChatCreate,
    GroupChatUpdate,
    GroupChatResponse,
    GroupChatDetail,
    GroupChatList,
    GroupMemberAdd,
    GroupMemberUpdate,
    GroupMemberResponse,
    GroupMessageCreate,
    GroupMessageUpdate,
    GroupMessageResponse,
    GroupMessageList,
)

router = APIRouter()


# ============ Helper Functions ============


async def get_group_or_404(db: AsyncSession, group_id: uuid.UUID) -> GroupChat:
    """Get a group chat by ID or raise 404."""
    result = await db.execute(select(GroupChat).where(GroupChat.id == group_id))
    group = result.scalars().first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found",
        )
    return group


async def get_membership(
    db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID
) -> Optional[GroupMember]:
    """Get a user's membership in a group."""
    result = await db.execute(
        select(GroupMember).where(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
            )
        )
    )
    return result.scalars().first()


async def require_membership(
    db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID
) -> GroupMember:
    """Require that a user is a member of a group."""
    membership = await get_membership(db, group_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group",
        )
    return membership


async def require_admin(
    db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID
) -> GroupMember:
    """Require that a user is an admin or owner of a group."""
    membership = await require_membership(db, group_id, user_id)
    if membership.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return membership


async def get_member_count(db: AsyncSession, group_id: uuid.UUID) -> int:
    """Get the number of members in a group."""
    result = await db.execute(
        select(func.count(GroupMember.id)).where(GroupMember.group_id == group_id)
    )
    return result.scalar() or 0


def member_to_response(
    member: GroupMember, user: Optional[User] = None
) -> GroupMemberResponse:
    """Convert a GroupMember to response schema."""
    return GroupMemberResponse(
        id=member.id,
        group_id=member.group_id,
        user_id=member.user_id,
        role=member.role,
        nickname=member.nickname,
        is_muted=member.is_muted,
        last_read_at=member.last_read_at,
        joined_at=member.joined_at,
        user_name=user.name if user else None,
        user_avatar=(
            user.profile.avatar_url
            if user and hasattr(user, "profile") and user.profile
            else None
        ),
    )


# ============ Group CRUD Endpoints ============


@router.post(
    "",
    response_model=GroupChatResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(5, Duration.MINUTE * 5))))],
)
async def create_group(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
    group_in: GroupChatCreate,
):
    """Create a new group chat."""
    group = GroupChat(
        name=group_in.name,
        description=group_in.description,
        avatar_url=group_in.avatar_url,
        owner_id=current_user.id,
        max_members=group_in.max_members,
    )
    db.add(group)
    await db.flush()

    # Add creator as owner member
    member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    await db.commit()
    await db.refresh(group)

    return GroupChatResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        avatar_url=group.avatar_url,
        owner_id=group.owner_id,
        is_active=group.is_active,
        max_members=group.max_members,
        member_count=1,
        last_message_at=group.last_message_at,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


@router.get("", response_model=GroupChatList)
async def list_my_groups(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
    limit: int = Query(default=20, le=50),
    offset: int = Query(default=0, ge=0),
):
    """List groups the current user is a member of."""
    # Get group IDs where user is a member
    member_query = select(GroupMember.group_id).where(
        GroupMember.user_id == current_user.id
    )

    # Get total count
    count_result = await db.execute(
        select(func.count(GroupChat.id)).where(
            and_(
                GroupChat.id.in_(member_query),
                GroupChat.is_active,
            )
        )
    )
    total = count_result.scalar() or 0

    # Get groups
    result = await db.execute(
        select(GroupChat)
        .where(
            and_(
                GroupChat.id.in_(member_query),
                GroupChat.is_active,
            )
        )
        .order_by(GroupChat.last_message_at.desc().nullslast())
        .limit(limit)
        .offset(offset)
    )
    groups = result.scalars().all()

    # Get member counts
    group_responses = []
    for group in groups:
        member_count = await get_member_count(db, group.id)
        group_responses.append(
            GroupChatResponse(
                id=group.id,
                name=group.name,
                description=group.description,
                avatar_url=group.avatar_url,
                owner_id=group.owner_id,
                is_active=group.is_active,
                max_members=group.max_members,
                member_count=member_count,
                last_message_at=group.last_message_at,
                created_at=group.created_at,
                updated_at=group.updated_at,
            )
        )

    return GroupChatList(groups=group_responses, total=total)


@router.get("/{group_id}", response_model=GroupChatDetail)
async def get_group(
    group_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Get details of a group chat."""
    group = await get_group_or_404(db, group_id)
    await require_membership(db, group_id, current_user.id)

    # Get members with user info
    result = await db.execute(
        select(GroupMember, User)
        .join(User, GroupMember.user_id == User.id)
        .where(GroupMember.group_id == group_id)
        .order_by(GroupMember.joined_at)
    )
    member_rows = result.all()

    members = [member_to_response(m, u) for m, u in member_rows]
    my_membership = next((m for m in members if m.user_id == current_user.id), None)

    return GroupChatDetail(
        id=group.id,
        name=group.name,
        description=group.description,
        avatar_url=group.avatar_url,
        owner_id=group.owner_id,
        is_active=group.is_active,
        max_members=group.max_members,
        member_count=len(members),
        last_message_at=group.last_message_at,
        created_at=group.created_at,
        updated_at=group.updated_at,
        members=members,
        my_membership=my_membership,
    )


@router.patch("/{group_id}", response_model=GroupChatResponse)
async def update_group(
    group_id: uuid.UUID,
    group_in: GroupChatUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Update a group chat. Requires admin or owner role."""
    group = await get_group_or_404(db, group_id)
    await require_admin(db, group_id, current_user.id)

    # Update fields
    update_data = group_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(group, field, value)

    group.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(group)

    member_count = await get_member_count(db, group_id)
    return GroupChatResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        avatar_url=group.avatar_url,
        owner_id=group.owner_id,
        is_active=group.is_active,
        max_members=group.max_members,
        member_count=member_count,
        last_message_at=group.last_message_at,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Delete a group chat. Only the owner can delete."""
    group = await get_group_or_404(db, group_id)

    if group.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group owner can delete the group",
        )

    # Soft delete
    group.is_active = False
    group.updated_at = datetime.utcnow()
    await db.commit()


# ============ Member Management Endpoints ============


@router.post("/{group_id}/members", response_model=GroupMemberResponse)
async def add_member(
    group_id: uuid.UUID,
    member_in: GroupMemberAdd,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Add a member to a group. Requires admin or owner role."""
    group = await get_group_or_404(db, group_id)
    await require_admin(db, group_id, current_user.id)

    # Check if user exists
    result = await db.execute(select(User).where(User.id == member_in.user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check if already a member
    existing = await get_membership(db, group_id, member_in.user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member",
        )

    # Check member limit
    member_count = await get_member_count(db, group_id)
    if member_count >= group.max_members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group has reached maximum member limit",
        )

    member = GroupMember(
        group_id=group_id,
        user_id=member_in.user_id,
        role="member",
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return member_to_response(member, user)


@router.patch("/{group_id}/members/{user_id}", response_model=GroupMemberResponse)
async def update_member(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    member_in: GroupMemberUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Update a member's settings. Admins can update roles, users can update their own settings."""
    await get_group_or_404(db, group_id)
    membership = await require_membership(db, group_id, current_user.id)
    target_membership = await get_membership(db, group_id, user_id)

    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Role changes require admin privileges
    if member_in.role is not None:
        if membership.role not in ("owner", "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required to change roles",
            )
        if target_membership.role == "owner":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change owner's role",
            )
        target_membership.role = member_in.role

    # Users can only update their own nickname/mute settings
    if member_in.nickname is not None or member_in.is_muted is not None:
        if user_id != current_user.id and membership.role not in ("owner", "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update other member's settings",
            )
        if member_in.nickname is not None:
            target_membership.nickname = member_in.nickname
        if member_in.is_muted is not None:
            target_membership.is_muted = member_in.is_muted

    await db.commit()
    await db.refresh(target_membership)

    # Get user info
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    return member_to_response(target_membership, user)


@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Remove a member from a group. Admins can remove others, users can leave."""
    await get_group_or_404(db, group_id)
    membership = await require_membership(db, group_id, current_user.id)
    target_membership = await get_membership(db, group_id, user_id)

    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Owner cannot be removed
    if target_membership.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the group owner",
        )

    # Check permissions
    is_self = user_id == current_user.id
    is_admin = membership.role in ("owner", "admin")

    if not is_self and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove other members",
        )

    await db.delete(target_membership)
    await db.commit()


# ============ Message Endpoints ============


@router.post(
    "/{group_id}/messages",
    response_model=GroupMessageResponse,
    dependencies=[Depends(RateLimiter(limiter=Limiter(Rate(30, Duration.MINUTE))))],
)
async def send_message(
    group_id: uuid.UUID,
    message_in: GroupMessageCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Send a message in a group chat."""
    group = await get_group_or_404(db, group_id)
    membership = await require_membership(db, group_id, current_user.id)

    if membership.is_muted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are muted in this group",
        )

    # Validate reply_to if provided
    if message_in.reply_to_id:
        result = await db.execute(
            select(GroupMessage).where(
                and_(
                    GroupMessage.id == message_in.reply_to_id,
                    GroupMessage.group_id == group_id,
                    not GroupMessage.is_deleted,
                )
            )
        )
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reply target message not found",
            )

    message = GroupMessage(
        group_id=group_id,
        sender_id=current_user.id,
        content=message_in.content,
        message_type=message_in.message_type,
        reply_to_id=message_in.reply_to_id,
    )
    db.add(message)

    # Update group's last_message_at
    group.last_message_at = datetime.utcnow()

    # Update sender's last_read_at
    membership.last_read_at = datetime.utcnow()

    await db.commit()
    await db.refresh(message)

    return GroupMessageResponse(
        id=message.id,
        group_id=message.group_id,
        sender_id=message.sender_id,
        content=message.content,
        message_type=message.message_type,
        reply_to_id=message.reply_to_id,
        is_edited=message.is_edited,
        is_deleted=message.is_deleted,
        created_at=message.created_at,
        sender_name=current_user.name,
        sender_avatar=(
            current_user.profile.avatar_url
            if hasattr(current_user, "profile") and current_user.profile
            else None
        ),
    )


@router.get("/{group_id}/messages", response_model=GroupMessageList)
async def get_messages(
    group_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
    limit: int = Query(default=50, le=100),
    before: Optional[datetime] = Query(default=None),
):
    """Get messages in a group chat."""
    await get_group_or_404(db, group_id)
    membership = await require_membership(db, group_id, current_user.id)

    # Build query
    conditions = [
        GroupMessage.group_id == group_id,
        not GroupMessage.is_deleted,
    ]
    if before:
        conditions.append(GroupMessage.created_at < before)

    # Get total count (without before filter for pagination info)
    count_result = await db.execute(
        select(func.count(GroupMessage.id)).where(
            and_(
                GroupMessage.group_id == group_id,
                not GroupMessage.is_deleted,
            )
        )
    )
    total = count_result.scalar() or 0

    # Get messages with sender info
    result = await db.execute(
        select(GroupMessage, User)
        .join(User, GroupMessage.sender_id == User.id)
        .where(and_(*conditions))
        .order_by(GroupMessage.created_at.desc())
        .limit(limit + 1)  # Get one extra to check has_more
    )
    rows = result.all()

    has_more = len(rows) > limit
    rows = rows[:limit]

    messages = [
        GroupMessageResponse(
            id=msg.id,
            group_id=msg.group_id,
            sender_id=msg.sender_id,
            content=msg.content,
            message_type=msg.message_type,
            reply_to_id=msg.reply_to_id,
            is_edited=msg.is_edited,
            is_deleted=msg.is_deleted,
            created_at=msg.created_at,
            sender_name=user.name,
            sender_avatar=(
                user.profile.avatar_url
                if hasattr(user, "profile") and user.profile
                else None
            ),
        )
        for msg, user in rows
    ]

    # Update last_read_at
    membership.last_read_at = datetime.utcnow()
    await db.commit()

    return GroupMessageList(
        messages=list(reversed(messages)),  # Return in chronological order
        total=total,
        has_more=has_more,
    )


@router.patch("/{group_id}/messages/{message_id}", response_model=GroupMessageResponse)
async def edit_message(
    group_id: uuid.UUID,
    message_id: uuid.UUID,
    message_in: GroupMessageUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Edit a message. Only the sender can edit their own messages."""
    await get_group_or_404(db, group_id)
    await require_membership(db, group_id, current_user.id)

    result = await db.execute(
        select(GroupMessage).where(
            and_(
                GroupMessage.id == message_id,
                GroupMessage.group_id == group_id,
            )
        )
    )
    message = result.scalars().first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    if message.sender_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit another user's message",
        )

    if message.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a deleted message",
        )

    message.content = message_in.content
    message.is_edited = True
    await db.commit()
    await db.refresh(message)

    return GroupMessageResponse(
        id=message.id,
        group_id=message.group_id,
        sender_id=message.sender_id,
        content=message.content,
        message_type=message.message_type,
        reply_to_id=message.reply_to_id,
        is_edited=message.is_edited,
        is_deleted=message.is_deleted,
        created_at=message.created_at,
        sender_name=current_user.name,
        sender_avatar=(
            current_user.profile.avatar_url
            if hasattr(current_user, "profile") and current_user.profile
            else None
        ),
    )


@router.delete(
    "/{group_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_message(
    group_id: uuid.UUID,
    message_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_user)],
):
    """Delete a message. Sender can delete their own, admins can delete any."""
    await get_group_or_404(db, group_id)
    membership = await require_membership(db, group_id, current_user.id)

    result = await db.execute(
        select(GroupMessage).where(
            and_(
                GroupMessage.id == message_id,
                GroupMessage.group_id == group_id,
            )
        )
    )
    message = result.scalars().first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    is_sender = message.sender_id == current_user.id
    is_admin = membership.role in ("owner", "admin")

    if not is_sender and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete another user's message",
        )

    # Soft delete
    message.is_deleted = True
    message.content = "[Message deleted]"
    await db.commit()
