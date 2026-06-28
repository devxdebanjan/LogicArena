"""Structured logging setup using Loguru."""

from __future__ import annotations

import sys
import uuid

from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config.settings import settings


def setup_logging() -> None:
    """Configures Loguru for the application."""
    logger.remove()

    if settings.is_production:
        logger.add(
            sys.stderr,
            level=settings.LOG_LEVEL.upper(),
            format="{message}",
            serialize=True,
        )
    else:
        logger.add(
            sys.stderr,
            level=settings.LOG_LEVEL.upper(),
            format=(
                "<green>{time:HH:mm:ss.SSS}</green> | "
                "<level>{level: <8}</level> | "
                "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
                "{extra[request_id]} | "
                "<level>{message}</level>"
            ),
            colorize=True,
        )

    logger.configure(extra={"request_id": "-"})
    logger.info("Logging configured (level={}, env={})", settings.LOG_LEVEL, settings.APP_ENV)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware that generates a unique request ID for every HTTP request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]

        with logger.contextualize(request_id=request_id):
            logger.info(
                "{} {} (client={})",
                request.method,
                request.url.path,
                request.client.host if request.client else "unknown",
            )
            response: Response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            logger.info("Response status={}", response.status_code)
            return response
