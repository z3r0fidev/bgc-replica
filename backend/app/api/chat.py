from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.chat import ChatRoom, Message, Conversation
from app.schemas.chat import ChatRoom as ChatRoomSchema, Message as MessageSchema, Conversation as ConversationSchema
from app.services.storage import storage_service
from app.services.chat import chat_service
import uuid
from sqlalchemy import select, desc, or_, and_

from app.schemas.common import PaginatedResponse
from app.core.pagination import paginate_query

router = APIRouter()

@router.get("/rooms", response_model=PaginatedResponse[ChatRoomSchema])
async def get_rooms(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: Optional[str] = Query(None),
    limit: int = 20,
    cursor: Optional[str] = None
):
    stmt = select(ChatRoom)
    if category:
        stmt = stmt.where(ChatRoom.category == category)
    return await paginate_query(db, stmt, ChatRoom, limit, cursor)

    stmt = select(Message).where(Message.room_id == room_id).options(selectinload(Message.sender))
    return await paginate_query(db, stmt, Message, limit, cursor)

@router.post("/media", response_model=dict)
async def upload_chat_media(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    file: UploadFile = File(...)
):
    content = await file.read()
    upload_result = await storage_service.upload_file(content, file.filename, file.content_type)
    return upload_result

@router.get("/conversations", response_model=PaginatedResponse[ConversationSchema])
async def get_conversations(
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
    cursor: Optional[str] = None
):
    stmt = select(Conversation).where(
        or_(Conversation.user_one_id == current_user.id, Conversation.user_two_id == current_user.id)
    )
    # Using last_message_at as cursor
    return await paginate_query(db, stmt, Conversation, limit, cursor, cursor_attribute="last_message_at")

@router.post("/conversations", response_model=ConversationSchema)
async def get_or_create_conversation(
    recipient_id: uuid.UUID,
    current_user: Annotated[User, Depends(deps.get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    return await chat_service.get_or_create_conversation(db, current_user.id, recipient_id)

@router.get("/conversations/{conv_id}/history", response_model=PaginatedResponse[MessageSchema])
async def get_conversation_history(
    conv_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
    cursor: Optional[str] = None
):
    stmt = select(Message).where(Message.conversation_id == conv_id).options(selectinload(Message.sender))
    return await paginate_query(db, stmt, Message, limit, cursor)
