"""Alembic env.py — configured for async migrations with SQLModel.

Key configuration:
  - Reads DATABASE_URL from environment (not alembic.ini)
  - Imports all models from app.models for autogenerate
  - Uses async engine with asyncpg driver
"""

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel

from alembic import context

# Alembic Config object
config = context.config

# Set up Python loggers from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import all models so Alembic can detect them ─────────────────────────────
# This import triggers model registration with SQLModel.metadata
from app.models import User  # noqa: F401

# Point Alembic at SQLModel's metadata (shared with SQLAlchemy)
target_metadata = SQLModel.metadata

# ── Override sqlalchemy.url from environment ─────────────────────────────────
# This avoids hardcoding the URL in alembic.ini
from app.config.settings import settings

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.get_secret_value())


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generates SQL without connecting)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migrations."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
