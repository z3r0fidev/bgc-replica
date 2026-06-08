import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.core.middleware import CacheControlMiddleware, SecurityHeadersMiddleware
import socketio
from app.core.socket_config import sio, initialize_redis_manager
from app.api.auth import router as auth_router
from app.api.profiles import router as profile_router
from app.api.social import router as social_router
from app.api.search import router as search_router
from app.api.forums import router as forums_router
from app.api.feed import router as feed_router
from app.api.groups import router as groups_router
from app.api.group_chats import router as group_chats_router
from app.api.moderation import router as moderation_router
from app.api.media import router as media_router
from app.api.gallery import router as gallery_router
from app.api.stories import router as stories_router
from app.api.block import router as block_router
from app.api.totp import router as totp_router
from app.api.notifications import router as notifications_router
from app.api.sessions import router as sessions_router
from app.api.verification import router as verification_router
from app.api.admin import router as admin_router
from app.core.database import SessionLocal
from app.core.redis_config import get_redis
from app.core.config import settings
from sqlalchemy import text
from app.core.exceptions import BaseAppException

from prometheus_fastapi_instrumentator import Instrumentator

from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# Initialize Tracing
if os.getenv("TESTING") != "true" and os.getenv("ENABLE_OTEL") == "true":
    provider = TracerProvider()
    processor = BatchSpanProcessor(OTLPSpanExporter())
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

import sentry_sdk

if os.getenv("TESTING") != "true":
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        # Add data like request headers and IP for users
        send_default_pii=True,
        # Enable sending logs to Sentry
        enable_logs=True,
        # Set traces_sample_rate to 0.1 to capture 10% of transactions for tracing
        traces_sample_rate=0.1,
        # Set profile_session_sample_rate to 0.1 to profile 10% of profile sessions
        profile_session_sample_rate=0.1,
        # Set profile_lifecycle to "trace" to automatically run the profiler when there is an active transaction
        profile_lifecycle="trace",
    )

from app.core.logging_config import setup_logging

setup_logging()

app = FastAPI(title="BGCLive Replica API")

# Instrument FastAPI
if os.getenv("TESTING") != "true" and os.getenv("ENABLE_OTEL") == "true":
    FastAPIInstrumentor.instrument_app(app)


@app.on_event("startup")
async def startup():
    # Initialize Socket.io Redis manager (graceful degradation if unavailable)
    await initialize_redis_manager()

    # Initialize FastAPI rate limiter with Redis
    try:
        r = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        await r.ping()  # Test connection before initializing
        await FastAPILimiter.init(r)
        app.state.rate_limiter_enabled = True
        print("Rate limiter: Redis connected successfully")
    except Exception as e:
        # In production, require Redis for rate limiting (fail-closed)
        if not settings.DEBUG:
            raise RuntimeError(
                f"Redis is required for rate limiting in production: {e}"
            )
        app.state.rate_limiter_enabled = False
        print(f"WARNING: Rate limiter disabled - Redis unavailable ({e})")


# Instrument Prometheus
if os.getenv("TESTING") != "true":
    Instrumentator().instrument(app).expose(app)


@app.exception_handler(BaseAppException)
async def app_exception_handler(request: Request, exc: BaseAppException):
    return JSONResponse(
        status_code=exc.status_code, content={"detail": exc.detail, "code": exc.code}
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CacheControlMiddleware)


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
app.include_router(forums_router, prefix="/api/forums", tags=["forums"])
app.include_router(feed_router, prefix="/api/feed", tags=["feed"])
app.include_router(groups_router, prefix="/api/groups", tags=["groups"])
app.include_router(group_chats_router, prefix="/api/group-chats", tags=["group-chats"])
app.include_router(moderation_router, prefix="/api/moderation", tags=["moderation"])
app.include_router(media_router, prefix="/api/media", tags=["media"])
app.include_router(gallery_router, prefix="/api/gallery", tags=["gallery"])
app.include_router(stories_router, prefix="/api/stories", tags=["stories"])
app.include_router(block_router, prefix="/api/block", tags=["block"])
app.include_router(totp_router, prefix="/api/2fa", tags=["2fa"])
app.include_router(
    notifications_router, prefix="/api/notifications", tags=["notifications"]
)
app.include_router(sessions_router, prefix="/api/sessions", tags=["sessions"])
app.include_router(
    verification_router, prefix="/api/verification", tags=["verification"]
)
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])

# Mount Socket.io
socket_app = socketio.ASGIApp(sio, socketio_path="")
app.mount("/socket.io", socket_app)
