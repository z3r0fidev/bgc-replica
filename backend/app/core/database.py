import re
import socket
import ssl as _ssl

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

# SSL required for external hosts (Supabase); not for Railway internal,
# localhost, or the plain `postgres:15` service container CI jobs use (its
# hostname is the Docker service alias "postgres", not localhost, since
# job steps and services run as separate containers on the same network).
# Must run before resolve_to_ipv4_url below, which replaces the hostname
# with a bare IP that these substring checks would no longer match.
# Supabase's PgBouncer pooler uses a private CA not in Python's standard
# bundle, so external connections encrypt without chain verification.
_is_external_db = not any(
    x in database_url for x in (".railway.internal", "localhost", "127.0.0.1", "@postgres:")
)

database_url = resolve_to_ipv4_url(database_url)
_connect_args: dict = {"timeout": 30, "command_timeout": 60}
if _is_external_db:
    _ssl_ctx = _ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = _ssl.CERT_NONE
    _connect_args["ssl"] = _ssl_ctx

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


def create_scoped_engine():
    """A fresh engine + sessionmaker pair, independent of the module-level
    `engine`/`SessionLocal` singleton above.

    For code that spins up its own event loop and tears it down when done -
    e.g. Celery tasks wrapped in app.services.tasks.run_async(), which each
    get a brand new loop per call. Reusing the shared `engine`'s connection
    pool across calls like that fails with "Task ... attached to a
    different loop" (or "Event loop is closed") once a second call happens
    in the same worker process, since pooled connections are tied to
    whichever loop created them. Callers must dispose() the returned
    engine when done - see app.services.tasks.ensure_future_partitions.
    """
    scoped_engine = create_async_engine(
        database_url,
        pool_pre_ping=True,
        connect_args=_connect_args,
    )
    scoped_session_factory = async_sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=scoped_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    return scoped_engine, scoped_session_factory


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as session:
        yield session
