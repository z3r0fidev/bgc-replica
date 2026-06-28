import asyncio
import re
import socket
import ssl as _ssl
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context


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

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
from app.core.database import Base
from app.core.config import settings
from app.models import *  # noqa

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    configuration = config.get_section(config.config_ini_section, {})
    db_url = settings.DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://"
    )
    db_url = resolve_to_ipv4_url(db_url)
    configuration["sqlalchemy.url"] = db_url

    # Supabase's PgBouncer pooler uses a private CA not in Python's standard bundle,
    # so we encrypt without chain verification (CERT_NONE).
    _is_external_db = not any(
        x in db_url for x in (".railway.internal", "localhost", "127.0.0.1")
    )
    _connect_args: dict = {"timeout": 30, "command_timeout": 60}
    if _is_external_db:
        _ssl_ctx = _ssl.create_default_context()
        _ssl_ctx.check_hostname = False
        _ssl_ctx.verify_mode = _ssl.CERT_NONE
        _connect_args["ssl"] = _ssl_ctx

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=_connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
