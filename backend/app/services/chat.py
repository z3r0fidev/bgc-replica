from typing import List, Optional
import uuid
from datetime import datetime
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.chat import Message, ChatRoom, Conversation
from app.services.location import search_users_nearby

class ChatService:
    async def get_or_create_conversation(
        self, db: AsyncSession, user_one: uuid.UUID, user_two: uuid.UUID
    ) -> Conversation:
        # Sort IDs to ensure consistency
        u1, u2 = sorted([user_one, user_two])
        
        stmt = select(Conversation).where(
            and_(
                Conversation.user_one_id == u1,
                Conversation.user_two_id == u2
            )
        )
        result = await db.execute(stmt)
        conv = result.scalars().first()
        
        if not conv:
            conv = Conversation(user_one_id=u1, user_two_id=u2)
            db.add(conv)
            await db.commit()
            await db.refresh(conv)
        
        return conv

    async def save_message(
        self, 
        db: AsyncSession, 
        sender_id: uuid.UUID, 
        content: str, 
        type: str = "TEXT",
        room_id: Optional[uuid.UUID] = None,
        conversation_id: Optional[uuid.UUID] = None
    ) -> Message:
        message = Message(
            sender_id=sender_id,
            content=content,
            type=type,
            room_id=room_id,
            conversation_id=conversation_id
        )
        db.add(message)
        
        if conversation_id:
            # Update last_message_at for the conversation
            stmt = select(Conversation).where(Conversation.id == conversation_id)
            result = await db.execute(stmt)
            conv = result.scalars().first()
            if conv:
                conv.last_message_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(message)
        return message

    async def suggest_dynamic_rooms(self, lat: float, lng: float) -> List[dict]:
        """
        Suggest rooms based on user concentration (SC-003 threshold: > 20 users in 50km).
        """
        nearby_users = await search_users_nearby(lat, lng, radius_km=50)
        
        if len(nearby_users) > 20:
            return [{
                "name": "Local Dynamic Room",
                "reason": f"High activity detected ({len(nearby_users)} users nearby)",
                "lat": lat,
                "lng": lng
            }]
        return []

chat_service = ChatService()