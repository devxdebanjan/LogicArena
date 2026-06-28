"""Arena multiplayer WebSocket endpoint"""

from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import async_session_factory
from app.core.security import decode_access_token
from app.engine.elo import generate_bot_elo
from app.models.user import User
from app.services.matchmaker import (
    join_queue,
    leave_queue,
    is_in_queue,
    create_friend_room,
    join_friend_room,
    cancel_friend_room,
    set_match_callbacks,
)
from app.services.match_manager import (
    create_match,
    submit_answer,
    handle_disconnect,
    is_player_in_match,
    get_player_match,
    set_send_callback,
    MatchState,
)

from app.services.mode3_match_manager import (
    create_mode3_match,
    is_player_in_mode3_match,
    handle_mode3_disconnect,
    get_player_mode3_match,
    submit_mode3_answer,
)

router = APIRouter(tags=["arena"])

_player_connections: dict[str, WebSocket] = {}
_player_friend_rooms: dict[str, str] = {}


async def _send_to_player(user_id: str, data: dict) -> None:
    """Sends a message to a connected player via WebSocket."""
    ws = _player_connections.get(user_id)
    if ws is None:
        return
    try:
        await ws.send_json(data)
    except Exception as e:
        logger.warning("Failed to send to player {}: {}", user_id, e)


async def _on_match_found(
    p1_id: str, p1_elo: int,
    p2_id: str, p2_elo: int,
    mode: int,
) -> None:
    """Invoked by the matchmaker when two players are paired."""
    if mode == 3:
        await create_mode3_match(p1_id, p1_elo, p2_id, p2_elo, is_bot=False, is_friend=False)
    else:
        await create_match(p1_id, p1_elo, p2_id, p2_elo, mode, is_bot=False, is_friend=False)


async def _on_bot_match(player_id: str, player_elo: int, mode: int) -> None:
    """Invoked by the matchmaker when a player needs a bot opponent."""
    bot_elo = generate_bot_elo(player_elo)
    bot_id = f"bot-{uuid.uuid4().hex[:12]}"
    if mode == 3:
        await create_mode3_match(player_id, player_elo, bot_id, bot_elo, is_bot=True, is_friend=False)
    else:
        await create_match(
            player_id, player_elo,
            bot_id, bot_elo,
            mode, is_bot=True, is_friend=False,
        )


def setup_arena_callbacks() -> None:
    """Wires up the matchmaker and match manager callbacks."""
    set_match_callbacks(_on_match_found, _on_bot_match)
    set_send_callback(_send_to_player)
    logger.info("Arena callbacks configured")


async def _authenticate_ws(token: str | None) -> str | None:
    """Validates JWT and returns the user_id."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        return payload.get("sub")
    except JWTError:
        return None


async def _get_user_elo(user_id: str) -> int:
    """Fetches the user's current Elo from the database."""
    try:
        async with async_session_factory() as db:
            user = await db.get(User, uuid.UUID(user_id))
            return user.elo if user else 1000
    except Exception:
        return 1000


async def _get_username(user_id: str) -> str:
    """Fetches the user's username from the database."""
    try:
        async with async_session_factory() as db:
            user = await db.get(User, uuid.UUID(user_id))
            return user.username if user else user_id[:8]
    except Exception:
        return user_id[:8]


@router.websocket("/ws/arena")
async def arena_ws(
    websocket: WebSocket,
    mode: int = Query(default=2),
    token: str | None = Query(default=None),
):
    """WebSocket handler for arena matches."""
    user_id = await _authenticate_ws(token)
    if user_id is None:
        await websocket.close(code=4001, reason="Authentication required for arena")
        return

    await websocket.accept()
    _player_connections[user_id] = websocket
    user_elo = await _get_user_elo(user_id)

    logger.info("Arena WS connected: user={} mode={} elo={}", user_id, mode, user_elo)

    try:
        while True:
            raw = await websocket.receive_json()
            msg_type = raw.get("type")

            if msg_type == "join_queue":
                if is_player_in_match(user_id):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Already in a match",
                    })
                    continue

                if await is_in_queue(user_id, 2):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Already in queue",
                    })
                    continue

                user_elo = await _get_user_elo(user_id)
                await join_queue(user_id, user_elo, mode=mode)

                await websocket.send_json({
                    "type": "queue_joined",
                    "position": 0,
                    "estimated_wait": "~5s",
                })

            elif msg_type == "leave_queue":
                await leave_queue(user_id, mode=mode)
                await websocket.send_json({
                    "type": "queue_left",
                })

            elif msg_type == "create_friend_room":
                if is_player_in_match(user_id):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Already in a match",
                    })
                    continue

                user_elo = await _get_user_elo(user_id)
                room_code = await create_friend_room(user_id, mode=mode, elo=user_elo)
                _player_friend_rooms[user_id] = room_code

                await websocket.send_json({
                    "type": "friend_room_created",
                    "room_code": room_code,
                })

            elif msg_type == "cancel_friend_room":
                room_code = _player_friend_rooms.pop(user_id, None)
                if room_code:
                    await cancel_friend_room(room_code)
                await websocket.send_json({
                    "type": "friend_room_cancelled",
                })

            elif msg_type == "join_friend_room":
                if is_player_in_match(user_id):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Already in a match",
                    })
                    continue

                room_code = str(raw.get("room_code", "")).strip().upper()
                if not room_code:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Room code is required",
                    })
                    continue

                room_info = await join_friend_room(user_id, room_code)
                if room_info is None:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid or expired room code",
                    })
                    continue

                user_elo = await _get_user_elo(user_id)
                creator_id = room_info["creator_id"]
                creator_elo = room_info["creator_elo"]

                _player_friend_rooms.pop(creator_id, None)
                room_mode = room_info["mode"]

                if room_mode == 3:
                    await create_mode3_match(
                        creator_id, creator_elo,
                        user_id, user_elo,
                        is_bot=False, is_friend=True,
                    )
                else:
                    await create_match(
                        creator_id, creator_elo,
                        user_id, user_elo,
                        mode=room_mode, is_bot=False, is_friend=True,
                    )

            elif msg_type == "resign":
                if is_player_in_mode3_match(user_id):
                    await handle_mode3_disconnect(user_id)
                elif is_player_in_match(user_id):
                    await handle_disconnect(user_id)
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Not in an active match",
                    })
                continue

            elif msg_type == "submit_answer":
                m3_room = get_player_mode3_match(user_id)
                if m3_room is not None:
                    user_answers = raw.get("user_answers", {})
                    result = await submit_mode3_answer(m3_room, user_id, user_answers)
                    
                    if "error" in result:
                        await websocket.send_json({
                            "type": "error",
                            "message": result["error"],
                        })
                        continue
                        
                    await websocket.send_json({
                        "type": "answer_result",
                        **result,
                    })
                    continue
                    
                room = get_player_match(user_id)
                if room is None or room.state != MatchState.IN_PROGRESS:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No active match",
                    })
                    continue

                user_answer = str(raw.get("answer", ""))
                q_index = raw.get("question_index", -1)

                result = await submit_answer(room, user_id, user_answer, q_index)

                if "error" in result:
                    await websocket.send_json({
                        "type": "error",
                        "message": result["error"],
                    })
                    continue

                await websocket.send_json({
                    "type": "answer_result",
                    **result,
                })

            elif msg_type == "pong":
                pass

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        logger.info("Arena WS disconnected: user={}", user_id)
    except Exception as e:
        logger.error("Arena WS error for user={}: {}", user_id, e)
    finally:
        _player_connections.pop(user_id, None)

        try:
            await leave_queue(user_id, mode=mode)
        except Exception:
            pass

        room_code = _player_friend_rooms.pop(user_id, None)
        if room_code:
            try:
                await cancel_friend_room(room_code)
            except Exception:
                pass

        try:
            if is_player_in_mode3_match(user_id):
                await handle_mode3_disconnect(user_id)
            else:
                await handle_disconnect(user_id)
        except Exception as e:
            logger.error("Error during match disconnect cleanup for user {}: {}", user_id, e)

        logger.info("Arena WS cleanup done: user={}", user_id)
