"""LogicArena Backend — FastAPI Application"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.v1 import v1_router
from app.api.v1.health import router as health_router
from app.config.database import close_db
from app.config.redis import close_redis, init_redis
from app.config.settings import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import RequestIDMiddleware, setup_logging
from app.core.websocket import connection_manager
from app.routes.arena import setup_arena_callbacks
from app.services.cleanup import guest_cleanup_loop
from app.services.matchmaker import matchmaker_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    setup_logging()
    logger.info("Starting {} v{} (env={})", settings.APP_NAME, settings.APP_VERSION, settings.APP_ENV)

    await init_redis()
    setup_arena_callbacks()

    # Background tasks
    # cleanup_task = asyncio.create_task(guest_cleanup_loop())
    matchmaker_task = asyncio.create_task(matchmaker_loop())

    logger.info("{} backend ready", settings.APP_NAME)

    yield

    logger.info("Shutting down {} backend...", settings.APP_NAME)

    # Cancel background tasks
    # cleanup_task.cancel()
    matchmaker_task.cancel()
    # try:
    #     await cleanup_task
    # except asyncio.CancelledError:
    #     pass
    try:
        await matchmaker_task
    except asyncio.CancelledError:
        pass

    await connection_manager.close_all()
    await close_redis()
    await close_db()

    logger.info("{} backend shut down", settings.APP_NAME)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Real-time competitive multiplayer Boolean algebra platform",
        lifespan=lifespan,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    app.add_middleware(RequestIDMiddleware)
    register_exception_handlers(app)

    app.include_router(v1_router)

    return app


app = create_app()
