import socketio
from jose import jwt, JWTError
from app.core.config import settings
from app.services.chat import chat_service
from app.services.presence import presence_service
from app.services.block_service import block_service
from app.core.database import SessionLocal
from app.core.redis_config import get_redis
import uuid
from datetime import datetime


def validate_jwt_token(token: str) -> str | None:
    """Validate JWT token and return user_id if valid, None otherwise."""
    try:
        secret = settings.NEXTAUTH_SECRET if settings.NEXTAUTH_SECRET else settings.SECRET_KEY
        # Hardcode algorithm to prevent algorithm manipulation attacks
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("user", {}).get("id")
        if user_id:
            # Validate it's a proper UUID
            uuid.UUID(user_id)
            return user_id
        return None
    except (JWTError, ValueError):
        return None


def extract_token_from_cookies(cookie_header: str) -> str | None:
    """Extract session token from cookie header string."""
    if not cookie_header:
        return None
    for cookie in cookie_header.split(";"):
        cookie = cookie.strip()
        if cookie.startswith("next-auth.session-token="):
            return cookie.split("=", 1)[1]
        if cookie.startswith("__Secure-next-auth.session-token="):
            return cookie.split("=", 1)[1]
    return None

# Track Redis availability for graceful degradation
_redis_available = False

# Initialize Socket.io Server WITHOUT Redis manager (in-memory mode)
# This ensures the app can start even if Redis is unavailable
#
# cors_allowed_origins is left open here because python-socketio only
# supports exact-match origins at this layer (no regex/callable), which
# can't express Vercel's per-deployment preview origins. The real origin
# check happens below in connect(), via settings.is_allowed_origin(),
# which does support the Vercel preview pattern.
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    client_manager=None,  # Start with in-memory, upgrade to Redis in startup
)


async def initialize_redis_manager():
    """
    Try to initialize Redis manager for Socket.io.
    Call this from app startup event.
    Returns True if Redis was connected, False otherwise.
    """
    global _redis_available, sio

    if not settings.REDIS_URL:
        print("Socket.io: No REDIS_URL configured, using in-memory mode")
        return False

    try:
        # Test Redis connection first
        import redis.asyncio as redis_client
        r = redis_client.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        await r.ping()
        await r.aclose()

        # Redis is available, create manager and reinitialize sio
        mgr = socketio.AsyncRedisManager(settings.REDIS_URL)
        sio.manager = mgr
        _redis_available = True
        print("Socket.io: Redis manager connected successfully")
        return True
    except Exception as e:
        _redis_available = False
        print(f"Socket.io: Redis unavailable ({e}), continuing with in-memory mode")
        return False


def is_redis_available():
    """Check if Redis is available for Socket.io."""
    return _redis_available


async def check_rate_limit(user_id: str) -> bool:
    """
    Simple rate limit: max 5 messages per 10 seconds.
    Falls back to allowing all messages if Redis is unavailable.
    """
    if not _redis_available:
        return True  # Allow all messages if Redis unavailable

    try:
        redis = await get_redis()
        key = f"ratelimit:{user_id}"
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, 10)
        return count <= 5
    except Exception:
        return True  # Allow message on Redis error


@sio.event
async def connect(sid, environ, auth):
    try:
        user_id = None

        # 1. Try getting token from auth payload
        if auth and "token" in auth:
            user_id = validate_jwt_token(auth["token"])

        # 2. Try getting token from cookies
        if not user_id:
            cookie_header = environ.get("HTTP_COOKIE", "")
            token = extract_token_from_cookies(cookie_header)
            if token:
                user_id = validate_jwt_token(token)

        # 3. Validate origin if user is authenticated
        if user_id:
            origin = environ.get("HTTP_ORIGIN", "")
            if origin and not settings.is_allowed_origin(origin):
                print(f"Connection rejected for {sid}: invalid origin {origin}")
                return False

            await sio.save_session(sid, {"user_id": user_id})
            await sio.enter_room(sid, str(user_id))
            await presence_service.update_presence(uuid.UUID(user_id), "online")
            print(f"Authenticated user {user_id} connected on {sid}")
        else:
            # Reject unauthenticated connections in production
            if not settings.DEBUG:
                print(f"Connection rejected for {sid}: no valid token")
                return False
            print(f"Anonymous client connected: {sid} (DEBUG mode)")
    except Exception as e:
        print(f"Connection rejected for {sid}: {str(e)}")
        return False  # Reject connection


@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    if session and "user_id" in session:
        user_id = session["user_id"]
        await presence_service.update_presence(uuid.UUID(user_id), "offline")
    print(f"Client disconnected: {sid}")


@sio.event
async def presence(sid, data):
    session = await sio.get_session(sid)
    if session and "user_id" in session:
        user_id = session["user_id"]
        status = data.get("status", "online")
        await presence_service.update_presence(uuid.UUID(user_id), status)


@sio.event
async def typing(sid, data):
    session = await sio.get_session(sid)
    if not session or "user_id" not in session:
        return

    user_id = session["user_id"]
    room_id = data.get("room_id")
    recipient_id = data.get("recipient_id")

    # Check block status for DM typing indicators
    if recipient_id:
        async with SessionLocal() as db:
            if await block_service.is_blocked(
                db, uuid.UUID(user_id), uuid.UUID(recipient_id)
            ):
                return  # Silently ignore typing to blocked users

    event_data = {"user_id": user_id, "is_typing": True}

    if room_id:
        await sio.emit("user_typing", event_data, room=str(room_id), skip_sid=sid)
    elif recipient_id:
        await sio.emit("user_typing", event_data, room=str(recipient_id), skip_sid=sid)


@sio.event
async def send_dm(sid, data):
    session = await sio.get_session(sid)
    if not session or "user_id" not in session:
        return

    user_id = session["user_id"]
    if not await check_rate_limit(user_id):
        await sio.emit("error", {"detail": "Rate limit exceeded. Slow down!"}, to=sid)
        return

    sender_id = uuid.UUID(user_id)
    recipient_id = uuid.UUID(data["recipient_id"])
    content = data["content"]
    msg_type = data.get("type", "TEXT")

    async with SessionLocal() as db:
        # Check if either user has blocked the other
        if await block_service.is_blocked(db, sender_id, recipient_id):
            await sio.emit("error", {"detail": "Cannot message this user"}, to=sid)
            return

        conv = await chat_service.get_or_create_conversation(
            db, sender_id, recipient_id
        )
        msg = await chat_service.save_message(
            db,
            sender_id=sender_id,
            content=content,
            type=msg_type,
            conversation_id=conv.id,
        )

        msg_data = {
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "conversation_id": str(msg.conversation_id),
            "content": msg.content,
            "type": msg.type,
            "created_at": msg.created_at.isoformat(),
        }

        await sio.emit("new_dm", msg_data, room=str(recipient_id))
        await sio.emit("new_dm", msg_data, room=str(sender_id))


@sio.event
async def join_room(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else "Anonymous"

    room_id = data["room_id"]
    await sio.enter_room(sid, str(room_id))

    # Broadcast system message
    system_msg = {
        "id": str(uuid.uuid4()),
        "sender_id": str(uuid.uuid4()),  # System sender ID
        "room_id": str(room_id),
        "content": f"User {user_id[:8]} joined the room",
        "type": "SYSTEM",
        "created_at": datetime.utcnow().isoformat(),
    }
    await sio.emit("new_room_message", system_msg, room=str(room_id))
    print(f"Client {sid} joined room {room_id}")


@sio.event
async def send_room_message(sid, data):
    session = await sio.get_session(sid)
    if not session or "user_id" not in session:
        return

    user_id = session["user_id"]
    if not await check_rate_limit(user_id):
        await sio.emit("error", {"detail": "Rate limit exceeded. Slow down!"}, to=sid)
        return

    sender_id = uuid.UUID(user_id)
    room_id = uuid.UUID(data["room_id"])
    content = data["content"]
    msg_type = data.get("type", "TEXT")

    async with SessionLocal() as db:
        msg = await chat_service.save_message(
            db, sender_id=sender_id, content=content, type=msg_type, room_id=room_id
        )

        msg_data = {
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "room_id": str(msg.room_id),
            "content": msg.content,
            "type": msg.type,
            "created_at": msg.created_at.isoformat(),
        }

        await sio.emit("new_room_message", msg_data, room=str(room_id))


@sio.event
async def join_forum(sid, data):
    session = await sio.get_session(sid)
    if not session or "user_id" not in session:
        return

    user_id = session["user_id"]
    forum_id = data["forum_id"]

    await sio.enter_room(sid, f"forum:{forum_id}")
    await presence_service.join_forum(uuid.UUID(forum_id), uuid.UUID(user_id))

    # Broadcast new count
    count = await presence_service.get_forum_active_count(uuid.UUID(forum_id))
    await sio.emit(
        "forum_stats_update",
        {"forum_id": forum_id, "active_users": count},
        room=f"forum:{forum_id}",
    )


@sio.event
async def leave_forum(sid, data):
    session = await sio.get_session(sid)
    if not session or "user_id" not in session:
        return

    user_id = session["user_id"]
    forum_id = data["forum_id"]

    await sio.leave_room(sid, f"forum:{forum_id}")
    await presence_service.leave_forum(uuid.UUID(forum_id), uuid.UUID(user_id))

    # Broadcast new count
    count = await presence_service.get_forum_active_count(uuid.UUID(forum_id))
    await sio.emit(
        "forum_stats_update",
        {"forum_id": forum_id, "active_users": count},
        room=f"forum:{forum_id}",
    )
