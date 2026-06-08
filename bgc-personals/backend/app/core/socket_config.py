import socketio
from app.core.config import settings
from app.core.redis_config import get_redis
import uuid
from datetime import datetime

# Initialize Async Redis Manager for scaling
mgr = socketio.AsyncRedisManager(settings.REDIS_URL)

# Initialize Async Socket.io Server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins="*",
    client_manager=mgr
)


async def check_rate_limit(user_id: str) -> bool:
    """
    Simple rate limit: max 5 messages per 10 seconds.
    """
    redis = await get_redis()
    key = f"ratelimit:personals:{user_id}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 10)
    return count <= 5


@sio.event
async def connect(sid, environ, auth):
    try:
        if auth and 'user_id' in auth:
            user_id = auth['user_id']
            uuid.UUID(user_id)

            await sio.save_session(sid, {'user_id': user_id})
            await sio.enter_room(sid, str(user_id))
            print(f"Authenticated user {user_id} connected on {sid}")
        else:
            print(f"Anonymous client connected: {sid}")
    except Exception as e:
        print(f"Connection rejected for {sid}: {str(e)}")
        return False


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")


@sio.event
async def join_post(sid, data):
    post_id = data['post_id']
    await sio.enter_room(sid, f"post:{post_id}:comments")
    print(f"Client {sid} joined post room {post_id}")


@sio.event
async def leave_post(sid, data):
    post_id = data['post_id']
    await sio.leave_room(sid, f"post:{post_id}:comments")
    print(f"Client {sid} left post room {post_id}")


@sio.event
async def send_post_comment(sid, data):
    session = await sio.get_session(sid)
    if not session or 'user_id' not in session:
        return

    user_id = session['user_id']
    if not await check_rate_limit(user_id):
        await sio.emit("error", {"detail": "Rate limit exceeded. Slow down!"}, to=sid)
        return

    author_id = uuid.UUID(user_id)
    post_id = uuid.UUID(data['post_id'])
    content = data['content']
    parent_id = data.get('parent_id')
    if parent_id:
        parent_id = uuid.UUID(parent_id)

    comment_data = {
        "id": str(uuid.uuid4()),
        "post_id": str(post_id),
        "author_id": str(author_id),
        "content": content,
        "parent_id": str(parent_id) if parent_id else None,
        "created_at": datetime.utcnow().isoformat()
    }

    await sio.emit("new_comment", comment_data, room=f"post:{post_id}:comments")
