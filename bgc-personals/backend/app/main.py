import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.core.socket_config import sio
from app.api.personals import router as personals_router
from app.api.personals_expansion import router as personals_expansion_router
from app.core.database import SessionLocal
from app.core.redis_config import get_redis
from app.core.config import settings
from sqlalchemy import text

from prometheus_fastapi_instrumentator import Instrumentator
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis

import sentry_sdk

if os.getenv("TESTING") != "true" and settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        send_default_pii=True,
        traces_sample_rate=1.0,
    )

app = FastAPI(title="BGC Personals API")


@app.on_event("startup")
async def startup():
    r = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(r)


if os.getenv("TESTING") != "true":
    Instrumentator().instrument(app).expose(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to BGC Personals API"}


@app.get("/health")
async def health_check():
    health = {"status": "ok", "checks": {}}

    try:
        async with SessionLocal() as db:
            await db.execute(text("SELECT 1"))
        health["checks"]["database"] = "up"
    except Exception:
        health["checks"]["database"] = "down"
        health["status"] = "error"

    try:
        redis_client = await get_redis()
        await redis_client.ping()
        health["checks"]["redis"] = "up"
    except Exception:
        health["checks"]["redis"] = "down"
        health["status"] = "error"

    return health


app.include_router(personals_router, prefix="/api/personals", tags=["personals"])
app.include_router(personals_expansion_router, prefix="/api/personals/posts", tags=["personals"])

# Mount Socket.io
socket_app = socketio.ASGIApp(sio, socketio_path="")
app.mount("/socket.io", socket_app)
