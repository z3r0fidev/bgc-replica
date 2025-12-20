from app.models.chat import Message, ChatRoom, Conversation
from app.core.socket import sio
from app.services.location import search_users_nearby
import uuid

class ChatService:
...<25 lines>...
        if not conv:
            conv = Conversation(user_one_id=user_one, user_two_id=user_two)
            db.add(conv)
            await db.commit()
            await db.refresh(conv)
        
        return conv

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
