"""Custom exception hierarchy and FastAPI exception handlers."""

from __future__ import annotations

from fastapi import FastAPI, Request, WebSocket, status
from fastapi.responses import JSONResponse
from loguru import logger


class LogicArenaError(Exception):
    """Base exception for all LogicArena domain errors."""

    def __init__(self, detail: str = "An error occurred", status_code: int = 500):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class AuthenticationError(LogicArenaError):
    """Raised when authentication fails."""

    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)


class AuthorizationError(LogicArenaError):
    """Raised when user lacks permission for an action."""

    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundError(LogicArenaError):
    """Raised when a requested resource does not exist."""

    def __init__(self, resource: str = "Resource", identifier: str = ""):
        detail = f"{resource} not found"
        if identifier:
            detail = f"{resource} '{identifier}' not found"
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ValidationError(LogicArenaError):
    """Raised for business-logic validation failures."""

    def __init__(self, detail: str = "Validation failed"):
        super().__init__(
            detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )


class WebSocketError(LogicArenaError):
    """Raised for WebSocket-specific errors."""

    def __init__(self, detail: str = "WebSocket error", code: int = 1008):
        self.ws_code = code
        super().__init__(detail=detail, status_code=code)


def register_exception_handlers(app: FastAPI) -> None:
    """Registers all custom exception handlers on the FastAPI app."""

    @app.exception_handler(LogicArenaError)
    async def logicarena_error_handler(
        request: Request, exc: LogicArenaError
    ) -> JSONResponse:
        logger.warning(
            "Domain error: {} (status={})", exc.detail, exc.status_code
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled exception: {}", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )
