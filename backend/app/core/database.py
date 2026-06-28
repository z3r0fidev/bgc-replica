import re
import socket

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


def resolve_to_ipv4_url(url: str) -> str:
    """Resolve the hostname in a PostgreSQL URL to an IPv4 address.

    Railway containers do not support IPv6. Supabase pooler hostnames
    (aws-0-*.pooler.supabase.com) may resolve only to AAAA records,
    causing OSError [Errno 101] ENETUNREACH. This forces an AF_INET
    lookup before the asyncpg connection is attempted.
    """
    match = re.search(r"@([^:/]+)", url)
    if not match:
        return url

    hostname = match.group(1)

    # Already an IPv4 dotted-decimal address — nothing to do.
    try:
        socket.inet_aton(hostname)
        return url
    except OSError:
        pass

    try:
        results = socket.getaddrinfo(hostname, None, socket.AF_INET)
        ipv4 = results[0][4][0]
        resolved_url = url.replace(f"@{hostname}:", f"@{ipv4}:", 1)
        print(f"DB: resolved {hostname} → {ipv4} (forced IPv4 for Railway)")
        return resolved_url
    except socket.gaierror as exc:
        print(
            f"ERROR: Could not resolve {hostname!r} to an IPv4 address: {exc}\n"
            "Railway containers do not support IPv6. Supabase pooler hostnames "
            "(aws-0-*.pooler.supabase.com) may return only AAAA records.\n"
            "Fix options:\n"
            "  1. Enable the Supabase IPv4 Add-on in your Supabase project settings.\n"
            "  2. Switch to Railway's managed PostgreSQL service instead."
        )
        raise


# If using asyncpg, ensure the URL starts with postgresql+asyncpg://
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

database_url = resolve_to_ipv4_url(database_url)

# SSL required for external hosts (Supabase); not for Railway internal or localhost
_is_external_db = not any(
    x in database_url for x in (".railway.internal", "localhost", "127.0.0.1")
)
_connect_args: dict = {"timeout": 30, "command_timeout": 60}
if _is_external_db:
    _connect_args["ssl"] = True

engine = create_async_engine(
    database_url,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
    connect_args=_connect_args,
    pool_timeout=30,
)
SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as session:
        yield session
