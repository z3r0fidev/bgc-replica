from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.core.socket import sio
from app.api.auth import router as auth_router
from app.api.profiles import router as profile_router
from app.api.social import router as social_router
from app.api.search import router as search_router
from app.core.database import SessionLocal
from app.core.redis import get_redis
from sqlalchemy import text

app = FastAPI(title="BGCLive Replica API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to BGCLive Replica API"}

@app.get("/health")
async def health_check():
    health = {"status": "ok", "checks": {}}
    
    # DB Check
    try:
        async with SessionLocal() as db:
            await db.execute(text("SELECT 1"))
        health["checks"]["database"] = "up"
    except Exception:
        health["checks"]["database"] = "down"
        health["status"] = "error"

    # Redis Check
    try:
        redis = await get_redis()
        await redis.ping()
        health["checks"]["redis"] = "up"
    except Exception:
        health["checks"]["redis"] = "down"
        health["status"] = "error"

    return health

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(profile_router, prefix="/api/profiles", tags=["profiles"])
app.include_router(social_router, prefix="/api/social", tags=["social"])
app.include_router(search_router, prefix="/api/search", tags=["search"])

# Mount Socket.io
socket_app = socketio.ASGIApp(sio, socketio_path="socket.io")
app.mount("/ws", socket_app)