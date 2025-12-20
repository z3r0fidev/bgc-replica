import socketio
from app.core.config import settings
from app.services.chat import chat_service
from app.services.presence import presence_service
from app.core.database import SessionLocal
from app.core.redis import get_redis
import uuid
from datetime import datetime

# Initialize Async Redis Manager for scaling
mgr = socketio.AsyncRedisManager(settings.REDIS_URL)

# Initialize Async Socket.io Server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins="*", # Adjust for production
    client_manager=mgr
)

async def check_rate_limit(user_id: str) -> bool:
    """
    Simple rate limit: max 5 messages per 10 seconds.
    """
    redis = await get_redis()
    key = f"ratelimit:{user_id}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 10)
    return count <= 5

@sio.event
async def connect(sid, environ, auth):
    # In a real app, validate JWT from auth header/cookie
    if auth and 'user_id' in auth:
        user_id = auth['user_id']
        await sio.save_session(sid, {'user_id': user_id})
        await sio.enter_room(sid, str(user_id)) # User's private room for DMs
        await presence_service.update_presence(uuid.UUID(user_id), "online")
        print(f"User {user_id} connected on {sid}")
    else:
        print(f"Anonymous client connected: {sid}")

@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    if session and 'user_id' in session:
        user_id = session['user_id']
        await presence_service.update_presence(uuid.UUID(user_id), "offline")
    print(f"Client disconnected: {sid}")

@sio.event
async def presence(sid, data):
    session = await sio.get_session(sid)
    if session and 'user_id' in session:
        user_id = session['user_id']
        status = data.get('status', 'online')
        await presence_service.update_presence(uuid.UUID(user_id), status)

@sio.event
async def typing(sid, data):
    session = await sio.get_session(sid)
    if not session or 'user_id' not in session:
        return
    
    user_id = session['user_id']
    room_id = data.get('room_id')
    recipient_id = data.get('recipient_id')
    
    event_data = {"user_id": user_id, "is_typing": True}
    
    if room_id:
        await sio.emit("user_typing", event_data, room=str(room_id), skip_sid=sid)
    elif recipient_id:
        await sio.emit("user_typing", event_data, room=str(recipient_id), skip_sid=sid)

@sio.event
async def send_dm(sid, data):
    session = await sio.get_session(sid)
    if not session or 'user_id' not in session:
        return
    
    user_id = session['user_id']
    if not await check_rate_limit(user_id):
        await sio.emit("error", {"detail": "Rate limit exceeded. Slow down!"}, to=sid)
        return

    sender_id = uuid.UUID(user_id)
    recipient_id = uuid.UUID(data['recipient_id'])
    content = data['content']
    msg_type = data.get('type', 'TEXT')

    async with SessionLocal() as db:
        conv = await chat_service.get_or_create_conversation(db, sender_id, recipient_id)
        msg = await chat_service.save_message(
            db, 
            sender_id=sender_id, 
            content=content, 
            type=msg_type, 
            conversation_id=conv.id
        )
        
        msg_data = {
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "conversation_id": str(msg.conversation_id),
            "content": msg.content,
            "type": msg.type,
            "created_at": msg.created_at.isoformat()
        }
        
        await sio.emit("new_dm", msg_data, room=str(recipient_id))
        await sio.emit("new_dm", msg_data, room=str(sender_id))

@sio.event
async def join_room(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get('user_id') if session else "Anonymous"
    
    room_id = data['room_id']
    await sio.enter_room(sid, str(room_id))
    
    # Broadcast system message
    system_msg = {
        "id": str(uuid.uuid4()),
        "sender_id": str(uuid.uuid4()), # System sender ID
        "room_id": str(room_id),
        "content": f"User {user_id[:8]} joined the room",
        "type": "SYSTEM",
        "created_at": datetime.utcnow().isoformat()
    }
    await sio.emit("new_room_message", system_msg, room=str(room_id))
    print(f"Client {sid} joined room {room_id}")

@sio.event
async def send_room_message(sid, data):
    session = await sio.get_session(sid)
    if not session or 'user_id' not in session:
        return
    
    user_id = session['user_id']
    if not await check_rate_limit(user_id):
        await sio.emit("error", {"detail": "Rate limit exceeded. Slow down!"}, to=sid)
        return

    sender_id = uuid.UUID(user_id)
    room_id = uuid.UUID(data['room_id'])
    content = data['content']
    msg_type = data.get('type', 'TEXT')

    async with SessionLocal() as db:
        msg = await chat_service.save_message(
            db, 
            sender_id=sender_id, 
            content=content, 
            type=msg_type, 
            room_id=room_id
        )
        
        msg_data = {
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "room_id": str(msg.room_id),
            "content": msg.content,
            "type": msg.type,
            "created_at": msg.created_at.isoformat()
        }
        
        await sio.emit("new_room_message", msg_data, room=str(room_id))