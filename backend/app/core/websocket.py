"""WebSocket Connection Manager with heartbeat and graceful disconnection."""

from __future__ import annotations

import asyncio
import uuid
from enum import IntEnum

from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger


class WSCloseCode(IntEnum):
    """WebSocket close codes used by LogicArena."""

    NORMAL = 1000
    GOING_AWAY = 1001
    POLICY_VIOLATION = 1008
    AUTH_FAILED = 4001
    AUTH_TIMEOUT = 4002
    HEARTBEAT_TIMEOUT = 4003
    SERVICE_RESTART = 4004
    DUPLICATE_CONNECTION = 4005


HEARTBEAT_INTERVAL = 30
HEARTBEAT_TIMEOUT = 10


class ConnectionManager:
    """Manages active WebSocket connections with heartbeat monitoring."""

    def __init__(self):
        self._connections: dict[uuid.UUID, WebSocket] = {}
        self._heartbeat_tasks: dict[uuid.UUID, asyncio.Task] = {}

    @property
    def active_count(self) -> int:
        """Gets the number of currently connected users."""
        return len(self._connections)

    def is_connected(self, user_id: uuid.UUID) -> bool:
        """Checks if a user has an active WebSocket connection."""
        return user_id in self._connections

    async def connect(self, websocket: WebSocket, user_id: uuid.UUID) -> None:
        """Registers a new WebSocket connection for a user."""
        if user_id in self._connections:
            logger.info("User {} reconnecting — closing old connection", user_id)
            await self._force_close(user_id, WSCloseCode.DUPLICATE_CONNECTION, "New connection established")

        await websocket.accept()
        self._connections[user_id] = websocket

        self._heartbeat_tasks[user_id] = asyncio.create_task(
            self._heartbeat_loop(user_id)
        )

        logger.info("WebSocket connected: user={} (total={})", user_id, self.active_count)

    async def disconnect(
        self,
        user_id: uuid.UUID,
        code: WSCloseCode = WSCloseCode.NORMAL,
        reason: str = "Connection closed",
    ) -> None:
        """Cleans up a disconnected user's resources."""
        if user_id in self._heartbeat_tasks:
            self._heartbeat_tasks[user_id].cancel()
            del self._heartbeat_tasks[user_id]

        if user_id in self._connections:
            del self._connections[user_id]

        logger.info(
            "WebSocket disconnected: user={} code={} reason='{}' (total={})",
            user_id, code, reason, self.active_count,
        )

    async def send_json(self, user_id: uuid.UUID, data: dict) -> bool:
        """Sends a JSON message to a specific user."""
        ws = self._connections.get(user_id)
        if ws is None:
            return False
        try:
            await ws.send_json(data)
            return True
        except Exception as e:
            logger.warning("Failed to send to user {}: {}", user_id, e)
            await self.disconnect(user_id, WSCloseCode.GOING_AWAY, str(e))
            return False

    async def broadcast(self, user_ids: list[uuid.UUID], data: dict) -> None:
        """Sends a JSON message to multiple users."""
        tasks = [self.send_json(uid, data) for uid in user_ids]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def close_all(self, code: WSCloseCode = WSCloseCode.SERVICE_RESTART) -> None:
        """Closes all connections gracefully."""
        logger.info("Closing all WebSocket connections (count={})", self.active_count)
        user_ids = list(self._connections.keys())
        for user_id in user_ids:
            await self._force_close(user_id, code, "Server shutting down")

    async def _force_close(
        self,
        user_id: uuid.UUID,
        code: WSCloseCode,
        reason: str,
    ) -> None:
        """Force-closes a WebSocket connection."""
        ws = self._connections.get(user_id)
        if ws is not None:
            try:
                await ws.close(code=int(code), reason=reason)
            except Exception:
                pass
        await self.disconnect(user_id, code, reason)

    async def _heartbeat_loop(self, user_id: uuid.UUID) -> None:
        """Sends periodic pings to detect dead connections."""
        try:
            while user_id in self._connections:
                await asyncio.sleep(HEARTBEAT_INTERVAL)

                ws = self._connections.get(user_id)
                if ws is None:
                    break

                try:
                    await ws.send_json({"type": "ping", "ts": asyncio.get_event_loop().time()})
                except Exception as e:
                    logger.warning("Heartbeat send failed for user {}: {}", user_id, e)
                    await self.disconnect(
                        user_id, WSCloseCode.HEARTBEAT_TIMEOUT, "Heartbeat failed"
                    )
                    break

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Heartbeat loop error for user {}: {}", user_id, e)


connection_manager = ConnectionManager()
