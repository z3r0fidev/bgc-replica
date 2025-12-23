import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.middleware import CacheControlMiddleware, SecurityHeadersMiddleware
import socketio
from app.core.socket import sio
from app.api.auth import router as auth_router
from app.api.profiles import router as profile_router
from app.api.social import router as social_router
from app.api.search import router as search_router
from app.api.forums import router as forums_router
from app.api.feed import router as feed_router
from app.api.groups import router as groups_router
from app.api.moderation import router as moderation_router
from app.api.media import router as media_router
from app.api.stories import router as stories_router
from app.core.database import SessionLocal
from app.core.redis import get_redis
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
        # Set traces_sample_rate to 1.0 to capture 100% of transactions for tracing
        traces_sample_rate=1.0,
        # Set profile_session_sample_rate to 1.0 to profile 100% of profile sessions
        profile_session_sample_rate=1.0,
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
    r = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(r)

# Instrument Prometheus
if os.getenv("TESTING") != "true":
    Instrumentator().instrument(app).expose(app)

@app.exception_handler(BaseAppException)
async def app_exception_handler(request: Request, exc: BaseAppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": exc.code
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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
app.include_router(moderation_router, prefix="/api/moderation", tags=["moderation"])
app.include_router(media_router, prefix="/api/media", tags=["media"])
app.include_router(stories_router, prefix="/api/stories", tags=["stories"])

# Mount Socket.io
socket_app = socketio.ASGIApp(sio, socketio_path="socket.io")
app.mount("/ws", socket_app)
