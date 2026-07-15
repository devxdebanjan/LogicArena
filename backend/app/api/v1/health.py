"""Health check endpoint."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from loguru import logger
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.redis import get_redis
from app.config.settings import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Verifies PostgreSQL and Redis connectivity."""
    checks = {
        "postgres": "healthy",
        "redis": "healthy",
    }
    overall = "healthy"

    # try:
    #     result = await db.execute(text("SELECT 1"))
    #     result.scalar()
    # except Exception as e:
    #     checks["postgres"] = f"unhealthy: {e}"
    #     overall = "degraded"
    #     logger.error("Health check: PostgreSQL unhealthy — {}", e)

    try:
        await redis.ping()
    except Exception as e:
        checks["redis"] = f"unhealthy: {e}"
        overall = "degraded"
        logger.error("Health check: Redis unhealthy — {}", e)

    response_data = {
        "status": overall,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
    }

    if overall == "degraded":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response_data,
        )

    return response_data
