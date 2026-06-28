"""Matchmaking service."""

from __future__ import annotations

import asyncio
import random
import string
import time
from typing import Optional

from loguru import logger

ELO_TOLERANCE = 200
BOT_TIMEOUT_SECONDS = 2
MATCHMAKER_INTERVAL = 2
FRIEND_ROOM_TTL = 300
ROOM_CODE_LENGTH = 6

_queues: dict[int, list[dict]] = {1: [], 2: [], 3: []}
_friend_rooms: dict[str, dict] = {}
_lock = asyncio.Lock()


async def join_queue(user_id: str, elo: int, mode: int) -> None:
    """Adds a player to the matchmaking queue."""
    async with _lock:
        for m in _queues:
            _queues[m] = [p for p in _queues[m] if p["user_id"] != user_id]

        _queues[mode].append({
            "user_id": user_id,
            "elo": elo,
            "joined_at": time.time(),
        })

        queue_size = len(_queues[mode])
        logger.info(
            "Player {} joined queue (mode={}, elo={}, queue_size={})",
            user_id, mode, elo, queue_size,
        )


async def leave_queue(user_id: str, mode: int) -> None:
    """Removes a player from the matchmaking queue."""
    async with _lock:
        if mode in _queues:
            _queues[mode] = [p for p in _queues[mode] if p["user_id"] != user_id]
        logger.info("Player {} left queue (mode={})", user_id, mode)


async def is_in_queue(user_id: str, mode: int) -> bool:
    """Checks if a player is currently in the queue."""
    async with _lock:
        if mode not in _queues:
            return False
        return any(p["user_id"] == user_id for p in _queues[mode])


async def get_queue_position(user_id: str, mode: int) -> Optional[int]:
    """Gets a player's position in the queue (0-indexed)."""
    async with _lock:
        if mode not in _queues:
            return None
        sorted_queue = sorted(_queues[mode], key=lambda x: x["elo"])
        for idx, p in enumerate(sorted_queue):
            if p["user_id"] == user_id:
                return idx
        return None


def _generate_room_code() -> str:
    """Generates a 6-character alphanumeric room code."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=ROOM_CODE_LENGTH))


async def create_friend_room(user_id: str, mode: int, elo: int) -> str:
    """Creates a friend room and returns the room code."""
    async with _lock:
        for _ in range(10):
            code = _generate_room_code()
            if code not in _friend_rooms:
                _friend_rooms[code] = {
                    "creator_id": user_id,
                    "mode": mode,
                    "creator_elo": elo,
                    "expires_at": time.time() + FRIEND_ROOM_TTL,
                }
                logger.info("Friend room created: code={} by user={}", code, user_id)
                return code

        raise RuntimeError("Failed to generate unique room code after 10 attempts")


async def join_friend_room(user_id: str, room_code: str) -> Optional[dict]:
    """Joins an existing friend room."""
    async with _lock:
        code_upper = room_code.upper()
        room = _friend_rooms.get(code_upper)
        if room is None:
            return None

        if time.time() > room["expires_at"]:
            _friend_rooms.pop(code_upper, None)
            return None

        if room["creator_id"] == user_id:
            return None

        _friend_rooms.pop(code_upper, None)

        logger.info(
            "Friend room joined: code={} by user={} (creator={})",
            room_code, user_id, room["creator_id"],
        )

        return {
            "creator_id": room["creator_id"],
            "mode": room["mode"],
            "creator_elo": room["creator_elo"],
        }


async def cancel_friend_room(room_code: str) -> None:
    """Cancels a friend room."""
    async with _lock:
        _friend_rooms.pop(room_code.upper(), None)
        logger.info("Friend room cancelled: code={}", room_code)


_on_match_found = None
_on_bot_match = None


def set_match_callbacks(on_match_found, on_bot_match) -> None:
    """Sets the callback functions for when matches are found."""
    global _on_match_found, _on_bot_match
    _on_match_found = on_match_found
    _on_bot_match = on_bot_match


async def _scan_queue_for_mode(mode: int) -> None:
    """Scans the queue for a specific mode and creates matches."""
    async with _lock:
        if mode not in _queues or not _queues[mode]:
            return

        now = time.time()
        paired_ids = set()

        sorted_players = sorted(_queues[mode], key=lambda x: x["elo"])

        i = 0
        while i < len(sorted_players) - 1:
            p1 = sorted_players[i]
            p2 = sorted_players[i + 1]

            if abs(p1["elo"] - p2["elo"]) <= ELO_TOLERANCE:
                paired_ids.add(p1["user_id"])
                paired_ids.add(p2["user_id"])

                logger.info(
                    "Match found: {} (elo={}) vs {} (elo={}) mode={}",
                    p1["user_id"], p1["elo"], p2["user_id"], p2["elo"], mode,
                )

                if _on_match_found:
                    try:
                        await _on_match_found(
                            p1["user_id"], p1["elo"],
                            p2["user_id"], p2["elo"],
                            mode
                        )
                    except Exception as e:
                        logger.error("Error creating match: {}", e)

                i += 2
            else:
                i += 1

        for player in sorted_players:
            if player["user_id"] in paired_ids:
                continue

            wait_time = now - player["joined_at"]
            if wait_time >= BOT_TIMEOUT_SECONDS:
                paired_ids.add(player["user_id"])

                logger.info(
                    "Bot match for {} (elo={}, waited={:.1f}s) mode={}",
                    player["user_id"], player["elo"], wait_time, mode,
                )

                if _on_bot_match:
                    try:
                        await _on_bot_match(player["user_id"], player["elo"], mode)
                    except Exception as e:
                        logger.error("Error creating bot match: {}", e)

        _queues[mode] = [p for p in _queues[mode] if p["user_id"] not in paired_ids]


async def _prune_expired_friend_rooms() -> None:
    """Removes expired friend rooms from memory."""
    async with _lock:
        now = time.time()
        expired = [code for code, room in _friend_rooms.items() if now > room["expires_at"]]
        for code in expired:
            _friend_rooms.pop(code, None)
            logger.info("Friend room expired: code={}", code)


async def matchmaker_loop() -> None:
    """Runs the background matchmaking loop."""
    logger.info("Matchmaker loop started (interval={}s)", MATCHMAKER_INTERVAL)

    await asyncio.sleep(2)

    while True:
        try:
            await _prune_expired_friend_rooms()

            await _scan_queue_for_mode(1)
            await _scan_queue_for_mode(2)
            await _scan_queue_for_mode(3)
        except asyncio.CancelledError:
            logger.info("Matchmaker loop cancelled")
            break
        except Exception as e:
            logger.error("Matchmaker loop error: {}", e)

        await asyncio.sleep(MATCHMAKER_INTERVAL)
