import pytest
import asyncio
from typing import AsyncGenerator
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# Use a test-specific database URL if provided, otherwise fallback to a default test DB name
TEST_DATABASE_URL = settings.DATABASE_URL.replace("/bgc_replica", "/bgc_test_db")
if "+asyncpg" not in TEST_DATABASE_URL:
    TEST_DATABASE_URL = TEST_DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

@pytest.fixture(scope="session", autouse=True)
async def cleanup_redis():
    yield
    from app.core.redis import redis_client
    try:
        await redis_client.aclose()
    except Exception:
        pass

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Provides a database session that rolls back after each test.
    """
    async with test_engine.connect() as connection:
        transaction = await connection.begin()
        
        session_factory = async_sessionmaker(
            autocommit=False, autoflush=False, bind=connection, class_=AsyncSession, expire_on_commit=False
        )
        session = session_factory()
        
        yield session
        
        await session.close()
        await transaction.rollback()

from app.models.user import User
from app.core.security import create_access_token
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
            is_active=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

@pytest.fixture(scope="session")
def auth_headers(test_user: User) -> dict:
    """Returns auth headers for the test user."""
    from jose import jwt
    from datetime import datetime, timedelta, timezone
    
    secret = settings.NEXTAUTH_SECRET if settings.NEXTAUTH_SECRET else settings.SECRET_KEY
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
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