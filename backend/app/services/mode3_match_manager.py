"""Mode 3 Match Manager — Handles single-puzzle races."""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, Optional

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.config.database import async_session_factory
from app.models.mode3_puzzle import Mode3Puzzle
from app.models.user import User
from app.engine.mode3_logic_engine import evaluate_mode3_solution
from app.services.match_manager import MatchState, _send, _cleanup_match as _cleanup_m2

@dataclass
class Mode3PlayerState:
    """Per-player state in a Mode 3 match."""
    user_id: str
    elo: int
    score: int = 0
    solved: bool = False
    solve_time_ms: Optional[int] = None


@dataclass
class Mode3MatchRoom:
    """State of an active Mode 3 match."""
    match_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    mode: int = 3
    state: MatchState = MatchState.MATCHED
    is_bot_match: bool = False
    is_friend_match: bool = False

    player1: Optional[Mode3PlayerState] = None
    player2: Optional[Mode3PlayerState] = None

    puzzle_id: str = ""
    puzzle_data: Dict[str, Any] = field(default_factory=dict)

    started_at: Optional[float] = None
    ended_at: Optional[float] = None


_active_mode3_matches: Dict[str, Mode3MatchRoom] = {}
_player_mode3_match_map: Dict[str, str] = {}
_active_mode3_bot_tasks: Dict[str, asyncio.Task] = {}


def get_mode3_match(match_id: str) -> Optional[Mode3MatchRoom]:
    """Gets an active Mode 3 match by ID."""
    return _active_mode3_matches.get(match_id)


def get_player_mode3_match(user_id: str) -> Optional[Mode3MatchRoom]:
    """Gets the active Mode 3 match for a player."""
    match_id = _player_mode3_match_map.get(user_id)
    if match_id:
        return _active_mode3_matches.get(match_id)
    return None


def is_player_in_mode3_match(user_id: str) -> bool:
    """Checks if a player is currently in an active Mode 3 match."""
    return user_id in _player_mode3_match_map


async def fetch_random_mode3_puzzle() -> Mode3Puzzle:
    """Fetches a random Mode 3 puzzle from the database."""
    async with async_session_factory() as db:
        result = await db.execute(
            select(Mode3Puzzle).order_by(func.random()).limit(1)
        )
        puzzle = result.scalar_one_or_none()
        if not puzzle:
            raise ValueError("No Mode 3 puzzles found in database")
        return puzzle


async def _get_username(user_id: str) -> str:
    """Fetches the user's username from the database."""
    try:
        async with async_session_factory() as db:
            user = await db.get(User, uuid.UUID(user_id))
            return user.username if user else user_id[:8]
    except Exception:
        return user_id[:8]


async def create_mode3_match(
    p1_id: str, p1_elo: int,
    p2_id: str, p2_elo: int,
    is_bot: bool = False,
    is_friend: bool = False,
) -> Mode3MatchRoom:
    """Creates a new Mode 3 match room and notifies both players."""
    puzzle = await fetch_random_mode3_puzzle()
    
    room = Mode3MatchRoom(
        is_bot_match=is_bot,
        is_friend_match=is_friend,
        player1=Mode3PlayerState(user_id=p1_id, elo=p1_elo),
        player2=Mode3PlayerState(user_id=p2_id, elo=p2_elo),
        puzzle_id=str(puzzle.id),
        puzzle_data=puzzle.puzzle_data,
    )
    
    _active_mode3_matches[room.match_id] = room
    _player_mode3_match_map[p1_id] = room.match_id
    _player_mode3_match_map[p2_id] = room.match_id

    bot_display_name = None
    if is_bot:
        from app.services.match_manager import _generate_bot_name
        bot_display_name = _generate_bot_name()

    p1_name = await _get_username(p1_id)
    p2_name = bot_display_name if is_bot else await _get_username(p2_id)

    await _send(p1_id, {
        "type": "match_found",
        "match_id": room.match_id,
        "opponent_name": p2_name,
        "opponent_elo": p2_elo,
        "mode": 3,
        "is_bot_match": is_bot,
        "is_friend_match": is_friend,
    })
    
    if not is_bot:
        await _send(p2_id, {
            "type": "match_found",
            "match_id": room.match_id,
            "opponent_name": p1_name,
            "opponent_elo": p1_elo,
            "mode": 3,
            "is_bot_match": is_bot,
            "is_friend_match": is_friend,
        })
        
    asyncio.create_task(_start_mode3_match(room))
    return room


async def _mode3_bot_loop(room: Mode3MatchRoom, bot_player: Mode3PlayerState) -> None:
    """Simulates a bot opponent solving a Mode 3 puzzle."""
    base_time = 120.0
    elo_diff = bot_player.elo - 1000
    solve_time = max(5.0, base_time - (elo_diff / 50.0))
    
    try:
        await asyncio.sleep(solve_time)
    except asyncio.CancelledError:
        return
        
    if room.state != MatchState.IN_PROGRESS:
        return
        
    bot_player.solved = True
    bot_player.solve_time_ms = int((time.monotonic() - room.started_at) * 1000)
    bot_player.score = 1
    
    await end_mode3_match(room, winner_id=bot_player.user_id, reason="solved")


async def _start_mode3_match(room: Mode3MatchRoom) -> None:
    """Transitions a Mode 3 match to the IN_PROGRESS state."""
    room.state = MatchState.IN_PROGRESS
    room.started_at = time.monotonic()
    
    match_data = {
        "type": "match_started",
        "match_id": room.match_id,
        "puzzle": {
            "id": room.puzzle_id,
            "data": room.puzzle_data
        }
    }
    
    await _send(room.player1.user_id, match_data)
    if not room.is_bot_match:
        await _send(room.player2.user_id, match_data)
    else:
        bot_player = room.player2
        task = asyncio.create_task(_mode3_bot_loop(room, bot_player))
        _active_mode3_bot_tasks[room.match_id] = task


async def submit_mode3_answer(room: Mode3MatchRoom, player_id: str, user_answers: Dict[str, str]) -> Dict[str, Any]:
    """Processes a puzzle solution submission in a Mode 3 match."""
    if room.state != MatchState.IN_PROGRESS:
        return {"error": "Match not in progress"}
        
    player = room.player1 if player_id == room.player1.user_id else room.player2
    opponent = room.player2 if player_id == room.player1.user_id else room.player1

    if player is None:
        return {"error": "Player not found in match"}
        
    is_correct = evaluate_mode3_solution(room.puzzle_data, user_answers)
    
    if is_correct:
        player.solved = True
        player.solve_time_ms = int((time.monotonic() - room.started_at) * 1000)
        player.score = 1
        
        await end_mode3_match(room, winner_id=player_id, reason="solved")
        return {"correct": True, "match_over": True}
        
    return {"correct": False, "match_over": False, "detail": "Incorrect logic"}


async def end_mode3_match(room: Mode3MatchRoom, winner_id: Optional[str] = None, reason: str = "forfeit") -> None:
    """Ends a Mode 3 match, computes Elo changes, and notifies players."""
    if room.state in (MatchState.COMPLETED, MatchState.FORFEIT):
        return
        
    room.state = MatchState.COMPLETED if reason != "forfeit" else MatchState.FORFEIT
    room.ended_at = time.monotonic()
    
    from app.services.elo_service import update_elo_after_match
    elo_result = await update_elo_after_match(room, winner_id, reason)
    
    p1 = room.player1
    p2 = room.player2
    
    if room.is_bot_match and room.match_id in _active_mode3_bot_tasks:
        _active_mode3_bot_tasks[room.match_id].cancel()
        _active_mode3_bot_tasks.pop(room.match_id, None)

    result_data = {
        "type": "match_ended",
        "reason": reason,
        "winner_id": winner_id,
        "is_draw": winner_id is None,
        "player1": {
            "user_id": p1.user_id,
            "solved": p1.solved,
            "solve_time_ms": p1.solve_time_ms,
            "elo_before": elo_result["p1_elo_before"],
            "elo_after": elo_result["p1_elo_after"],
            "elo_change": elo_result["p1_elo_after"] - elo_result["p1_elo_before"]
        },
        "player2": {
            "user_id": p2.user_id,
            "solved": p2.solved,
            "solve_time_ms": p2.solve_time_ms,
            "elo_before": elo_result["p2_elo_before"],
            "elo_after": elo_result["p2_elo_after"],
            "elo_change": elo_result["p2_elo_after"] - elo_result["p2_elo_before"]
        }
    }
    
    await _send(p1.user_id, result_data)
    if not room.is_bot_match:
        await _send(p2.user_id, result_data)
        
    _cleanup_mode3_match(room)


def _cleanup_mode3_match(room: Mode3MatchRoom) -> None:
    """Cleans up active Mode 3 match registries."""
    _active_mode3_matches.pop(room.match_id, None)
    if room.player1:
        _player_mode3_match_map.pop(room.player1.user_id, None)
    if room.player2:
        _player_mode3_match_map.pop(room.player2.user_id, None)


async def handle_mode3_disconnect(user_id: str) -> None:
    """Handles a player disconnecting during a Mode 3 match."""
    room = get_player_mode3_match(user_id)
    if not room or room.state not in (MatchState.MATCHED, MatchState.IN_PROGRESS):
        return
    await end_mode3_match(room, winner_id=room.player2.user_id if user_id == room.player1.user_id else room.player1.user_id, reason="forfeit")
