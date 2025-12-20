from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime

class MessageBase(BaseModel):
    content: str
    type: str = "TEXT"

class MessageCreate(MessageBase):
    room_id: Optional[uuid.UUID] = None
    conversation_id: Optional[uuid.UUID] = None

class Message(MessageBase):
    id: uuid.UUID
    sender_id: uuid.UUID
    room_id: Optional[uuid.UUID] = None
    conversation_id: Optional[uuid.UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRoomBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    is_public: bool = True

class ChatRoomCreate(ChatRoomBase):
    pass

class ChatRoom(ChatRoomBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    user_one_id: uuid.UUID
    user_two_id: uuid.UUID

class Conversation(ConversationBase):
    id: uuid.UUID
    last_message_at: datetime

    class Config:
        from_attributes = True
