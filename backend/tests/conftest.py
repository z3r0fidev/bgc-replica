import pytest
from typing import AsyncGenerator
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# Use a test-specific database URL if provided, otherwise fallback to a default test DB name
TEST_DATABASE_URL = settings.DATABASE_URL.replace("/bgc_replica", "/bgc_test_db")
if "+asyncpg" not in TEST_DATABASE_URL:
    TEST_DATABASE_URL = TEST_DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://"
    )


@pytest.fixture(scope="session", autouse=True)
async def cleanup_redis():
    yield
    from app.core.redis_config import redis_client

    try:
        await redis_client.aclose()
    except Exception:
        pass


@pytest.fixture(scope="session", autouse=True)
def disable_rate_limiting():
    """
    Patch RateLimiter to a no-op for all tests.
    fastapi-limiter 0.2.0 accesses request.scope['router'].path which raises
    AttributeError on _IncludedRouter when using httpx ASGITransport.
    The Request type annotation is required so FastAPI injects the HTTP request
    object rather than treating 'request' as a required query/form parameter.
    """
    from fastapi import Request, Response
    from fastapi_limiter.depends import RateLimiter

    async def _noop(self, request: Request, response: Response = None):
        pass

    original = RateLimiter.__call__
    RateLimiter.__call__ = _noop
    yield
    RateLimiter.__call__ = original


@pytest.fixture(scope="session", autouse=True)
def mock_storage_upload():
    """
    Prevent storage_service.upload_file from calling Supabase in CI.

    storage_service is a module-level singleton imported directly into gallery.py
    (not a FastAPI Depends), so app.dependency_overrides cannot intercept it.
    patch.object targets the singleton instance so Supabase credentials are never
    required. scope="session" is required because the schemathesis contract test
    is module-scoped; function-scoped monkeypatch cannot span it.
    """
    from unittest.mock import AsyncMock, patch
    from app.services.storage import storage_service as _svc

    fake = {
        "url": "https://storage.example.com/ci-test.bin",
        "storage_path": "media/ci-test.bin",
    }
    with patch.object(_svc, "upload_file", AsyncMock(return_value=fake)):
        yield


@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # DROP SCHEMA CASCADE handles FK-dependent tables that SQLAlchemy's
    # drop_all can't order correctly (e.g. gallery_media → album_media FK).
    # GRANT statements restore default privileges after schema recreation.
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Provides a database session that rolls back after each test.
    """
    async with test_engine.connect() as connection:
        transaction = await connection.begin()

        session_factory = async_sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=connection,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        session = session_factory()

        yield session

        await session.close()
        await transaction.rollback()


from app.models.user import User, Profile
import uuid


@pytest.fixture(scope="session")
async def test_user(test_engine) -> User:
    """Creates a test user in the database."""
    async with async_sessionmaker(test_engine, class_=AsyncSession)() as session:
        user = User(
            id=uuid.uuid4(),
            email=f"test-{uuid.uuid4()}@example.com",
            name="Test User",
            hashed_password="hashed_password",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest.fixture(scope="session")
async def test_target_user(test_engine) -> User:
    """A second user used as a target for social/ratings endpoints."""
    async with async_sessionmaker(test_engine, class_=AsyncSession)() as session:
        user = User(
            id=uuid.uuid4(),
            email=f"target-{uuid.uuid4()}@example.com",
            name="Target User",
            hashed_password="hashed_password",
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest.fixture(scope="session", autouse=True)
async def test_profile(test_engine, test_user: User) -> Profile:
    """Creates a profile for test_user so endpoints requiring a profile work."""
    async with async_sessionmaker(test_engine, class_=AsyncSession)() as session:
        profile = Profile(id=test_user.id, display_name="Test User")
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
        return profile


@pytest.fixture(scope="session")
def auth_headers(test_user: User) -> dict:
    """Returns auth headers for the test user."""
    from jose import jwt
    from datetime import datetime, timedelta, timezone

    secret = (
        settings.NEXTAUTH_SECRET if settings.NEXTAUTH_SECRET else settings.SECRET_KEY
    )
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"exp": expire, "sub": str(test_user.id)}
    token = jwt.encode(to_encode, secret, algorithm=settings.ALGORITHM)

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Provides an HTTPX AsyncClient that uses the test database session.
    """

    async def _get_test_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_test_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def client(async_client: AsyncClient) -> AsyncClient:
    """Compatibility fixture for existing tests."""
    return async_client


@pytest.fixture
async def db(db_session: AsyncSession) -> AsyncGenerator[AsyncSession, None]:
    """Alias for db_session."""
    yield db_session


@pytest.fixture(scope="session")
def token(auth_headers: dict) -> str:
    """Returns just the JWT token string."""
    return auth_headers["Authorization"].removeprefix("Bearer ")


@pytest.fixture(scope="session")
def alembic_engine():
    from sqlalchemy import create_engine, text as sync_text
    sync_url = TEST_DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url)
    yield engine
    with engine.begin() as conn:
        conn.execute(sync_text("DROP SCHEMA public CASCADE"))
        conn.execute(sync_text("CREATE SCHEMA public"))
        conn.execute(sync_text("GRANT ALL ON SCHEMA public TO postgres"))
        conn.execute(sync_text("GRANT ALL ON SCHEMA public TO public"))
    engine.dispose()


@pytest.fixture(scope="session")
def alembic_config():
    return {"file": "alembic.ini", "script_location": "alembic"}
