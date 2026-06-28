"""Async Redis connection pool and dependency"""

from __future__ import annotations

from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from loguru import logger

from app.config.settings import settings

_redis_pool: aioredis.Redis | None = None


async def init_redis() -> aioredis.Redis:
    """Creates the global Redis connection pool once at startup"""
    global _redis_pool
    _redis_pool = aioredis.from_url(
        settings.REDIS_URL.get_secret_value(),
        decode_responses=True,
        max_connections=10,
    )
    await _redis_pool.ping()
    logger.info("Redis connection established")
    return _redis_pool


async def close_redis() -> None:
    """Closes the Redis connection pool once at shutdown"""
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None
        logger.info("Redis connection closed")


def get_redis_pool() -> aioredis.Redis:
    """Gets the raw Redis pool for non-dependency contexts like background tasks"""
    if _redis_pool is None:
        raise RuntimeError("Redis not initialised — call init_redis() first")
    return _redis_pool


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """Yields the Redis client for FastAPI route dependencies"""
    if _redis_pool is None:
        raise RuntimeError("Redis not initialised — call init_redis() first")
    yield _redis_pool
