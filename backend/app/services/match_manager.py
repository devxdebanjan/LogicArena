"""Match Manager — in-memory match room state machine."""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, List, Optional

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.bot_service import run_bot

from app.config.database import async_session_factory
from app.models.user import User
from app.engine.elo import generate_bot_elo
from app.services.game_service import (
    MATCH_DURATION_SECONDS,
    QuestionRecord,
    prepare_match,
    _serialize_question,
)
from app.engine.mode2_logic_engine import verify_answer


class MatchState(str, Enum):
    MATCHED = "matched"
    COUNTDOWN = "countdown"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FORFEIT = "forfeit"


@dataclass
class PlayerState:
    """Per-player state within a match."""
    user_id: str
    elo: int
    score: int = 0
    question_index: int = 0
    questions_solved: int = 0
    question_records: List[QuestionRecord] = field(default_factory=list)
    last_answer_time: Optional[float] = None


@dataclass
class MatchRoom:
    """State of an active multiplayer match."""
    match_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    mode: int = 2
    state: MatchState = MatchState.MATCHED
    is_bot_match: bool = False
    is_friend_match: bool = False

    player1: Optional[PlayerState] = None
    player2: Optional[PlayerState] = None

    questions: List[QuestionRecord] = field(default_factory=list)

    started_at: Optional[float] = None
    ended_at: Optional[float] = None

    countdown_task: Optional[asyncio.Task] = None
    timer_task: Optional[asyncio.Task] = None
    bot_task: Optional[asyncio.Task] = None


_active_matches: Dict[str, MatchRoom] = {}
_player_match_map: Dict[str, str] = {}
_send_to_player: Optional[Callable[[str, dict], Coroutine]] = None

MIN_ANSWER_INTERVAL = 0.5


def set_send_callback(callback: Callable[[str, dict], Coroutine]) -> None:
    """Sets the WebSocket send callback."""
    global _send_to_player
    _send_to_player = callback


async def _send(user_id: str, data: dict) -> None:
    """Sends a message to a player via WebSocket."""
    if _send_to_player:
        try:
            await _send_to_player(user_id, data)
        except Exception as e:
            logger.warning("Failed to send to {}: {}", user_id, e)


def get_match(match_id: str) -> Optional[MatchRoom]:
    """Gets an active match by ID."""
    return _active_matches.get(match_id)


def get_player_match(user_id: str) -> Optional[MatchRoom]:
    """Gets the active match for a player."""
    match_id = _player_match_map.get(user_id)
    if match_id:
        return _active_matches.get(match_id)
    return None


def is_player_in_match(user_id: str) -> bool:
    """Checks if a player is currently in an active match."""
    return user_id in _player_match_map


async def _get_username(user_id: str) -> str:
    """Fetches the user's username from the database."""
    try:
        async with async_session_factory() as db:
            user = await db.get(User, uuid.UUID(user_id))
            return user.username if user else user_id[:8]
    except Exception:
        return user_id[:8]


async def create_match(
    p1_id: str,
    p1_elo: int,
    p2_id: str,
    p2_elo: int,
    mode: int,
    is_bot: bool = False,
    is_friend: bool = False,
) -> MatchRoom:
    """Creates a new match room and notifies both players."""
    room = MatchRoom(
        mode=mode,
        is_bot_match=is_bot,
        is_friend_match=is_friend,
        player1=PlayerState(user_id=p1_id, elo=p1_elo),
        player2=PlayerState(user_id=p2_id, elo=p2_elo),
    )

    async with async_session_factory() as db:
        practice_session = await prepare_match(db, mode=mode)

    room.questions = practice_session.questions

    for q in room.questions:
        room.player1.question_records.append(
            QuestionRecord(index=q.index, circuit=q.circuit, token=q.token)
        )
        room.player2.question_records.append(
            QuestionRecord(index=q.index, circuit=q.circuit, token=q.token)
        )

    _active_matches[room.match_id] = room
    _player_match_map[p1_id] = room.match_id
    _player_match_map[p2_id] = room.match_id

    logger.info(
        "Match {} created: {} (elo={}) vs {} (elo={}) mode={} bot={} friend={}",
        room.match_id, p1_id, p1_elo, p2_id, p2_elo, mode, is_bot, is_friend,
    )

    bot_display_name = _generate_bot_name() if is_bot else None
    p1_name = await _get_username(p1_id)
    p2_name = bot_display_name if is_bot else await _get_username(p2_id)

    await _send(p1_id, {
        "type": "match_found",
        "match_id": room.match_id,
        "opponent_name": p2_name,
        "opponent_elo": p2_elo,
        "mode": room.mode,
        "is_bot_match": is_bot,
        "is_friend_match": is_friend,
    })

    if not is_bot:
        await _send(p2_id, {
            "type": "match_found",
            "match_id": room.match_id,
            "opponent_name": p1_name,
            "opponent_elo": p1_elo,
            "mode": room.mode,
            "is_bot_match": False,
            "is_friend_match": is_friend,
        })

    room.countdown_task = asyncio.create_task(_countdown(room))

    return room


async def _countdown(room: MatchRoom) -> None:
    """Runs a 3-second countdown before the match starts."""
    room.state = MatchState.COUNTDOWN

    for i in range(3, 0, -1):
        data = {"type": "countdown", "seconds_remaining": i}
        await _send(room.player1.user_id, data)
        if not room.is_bot_match:
            await _send(room.player2.user_id, data)
        await asyncio.sleep(1)

    await _start_match(room)


async def _start_match(room: MatchRoom) -> None:
    """Transitions the match to IN_PROGRESS, sending the first question and starting the timer."""
    room.state = MatchState.IN_PROGRESS
    room.started_at = time.monotonic()

    first_q = room.questions[0] if room.questions else None
    if first_q:
        for player in [room.player1, room.player2]:
            if player.question_records:
                player.question_records[0].served_at = room.started_at

    match_started_data = {
        "type": "match_started",
        "match_id": room.match_id,
        "questions": [_serialize_question(q) for q in room.questions],
        "question": _serialize_question(first_q) if first_q else None,
        "total_questions": len(room.questions),
        "duration_seconds": MATCH_DURATION_SECONDS,
    }

    await _send(room.player1.user_id, match_started_data)
    if not room.is_bot_match:
        await _send(room.player2.user_id, match_started_data)

    room.timer_task = asyncio.create_task(_timer(room))

    if room.is_bot_match:
        room.bot_task = asyncio.create_task(
            run_bot(room, room.player1.elo)
        )

    logger.info("Match {} started", room.match_id)


async def _timer(room: MatchRoom) -> None:
    """Runs the server-side authoritative match timer."""
    await asyncio.sleep(MATCH_DURATION_SECONDS + 1.5)
    if room.state == MatchState.IN_PROGRESS:
        await end_match(room, "timer_expired")


async def submit_answer(
    room: MatchRoom,
    player_id: str,
    answer: str,
    question_index: int,
) -> Dict[str, Any]:
    """Processes an answer submission from a player."""
    if room.state != MatchState.IN_PROGRESS:
        return {"error": "Match is not in progress"}

    if room.player1 and player_id == room.player1.user_id:
        player = room.player1
        opponent = room.player2
    elif room.player2 and player_id == room.player2.user_id:
        player = room.player2
        opponent = room.player1
    else:
        return {"error": "Player not in this match"}

    if question_index != player.question_index:
        return {"error": f"Expected question {player.question_index}, got {question_index}"}

    now = time.monotonic()
    if player.last_answer_time is not None:
        delta = now - player.last_answer_time
        if delta < MIN_ANSWER_INTERVAL:
            return {"error": "Answering too fast — please slow down"}

    if question_index >= len(player.question_records):
        return {"error": "No more questions"}

    q_record = player.question_records[question_index]
    q_record.answered_at = now
    q_record.user_answer = answer
    player.last_answer_time = now

    question = room.questions[question_index]
    correct = verify_answer(answer, question.token)
    q_record.correct = correct

    if correct:
        player.score += 1
        player.questions_solved += 1
    else:
        player.score -= 2

    player.question_index += 1
    next_q = None
    if player.question_index < len(room.questions):
        next_q = room.questions[player.question_index]
        player.question_records[player.question_index].served_at = time.monotonic()

    result = {
        "correct": correct,
        "score": player.score,
        "question_index": question_index,
        "next_question": _serialize_question(next_q) if next_q else None,
        "has_more": next_q is not None,
        "opponent_score": opponent.score if opponent else 0,
        "opponent_solved": opponent.questions_solved if opponent else 0,
    }

    if opponent and not room.is_bot_match:
        await _send(opponent.user_id, {
            "type": "opponent_progress",
            "opponent_score": player.score,
            "opponent_solved": player.questions_solved,
        })

    return result


async def end_match(room: MatchRoom, reason: str = "timer_expired", winner_id: Optional[str] = None) -> None:
    """Ends the match, determines the winner, updates Elo, and notifies players."""
    if room.state in (MatchState.COMPLETED, MatchState.FORFEIT):
        return

    room.state = MatchState.COMPLETED if reason != "forfeit" else MatchState.FORFEIT
    room.ended_at = time.monotonic()

    await _cancel_tasks(room)

    p1 = room.player1
    p2 = room.player2

    if winner_id is None:
        if p1.score > p2.score:
            winner_id = p1.user_id
        elif p2.score > p1.score:
            winner_id = p2.user_id

    from app.services.elo_service import update_elo_after_match
    elo_result = await update_elo_after_match(room, winner_id, reason)

    p1_stats = _compute_player_stats(p1)
    p2_stats = _compute_player_stats(p2)

    result_data = {
        "type": "match_ended",
        "reason": reason,
        "match_id": room.match_id,
        "winner_id": winner_id,
        "is_draw": winner_id is None,
        "player1": {
            "user_id": p1.user_id,
            "score": p1.score,
            "questions_solved": p1.questions_solved,
            "elo_before": elo_result["p1_elo_before"],
            "elo_after": elo_result["p1_elo_after"],
            "elo_change": elo_result["p1_elo_after"] - elo_result["p1_elo_before"],
            **p1_stats,
        },
        "player2": {
            "user_id": p2.user_id,
            "score": p2.score,
            "questions_solved": p2.questions_solved,
            "elo_before": elo_result["p2_elo_before"],
            "elo_after": elo_result["p2_elo_after"],
            "elo_change": elo_result["p2_elo_after"] - elo_result["p2_elo_before"],
            **p2_stats,
        },
    }

    await _send(p1.user_id, result_data)
    if not room.is_bot_match:
        await _send(p2.user_id, result_data)

    logger.info(
        "Match {} ended ({}): {} ({}) vs {} ({}), winner={}",
        room.match_id, reason,
        p1.user_id, p1.score,
        p2.user_id, p2.score,
        winner_id or "draw",
    )

    _cleanup_match(room)


async def handle_disconnect(user_id: str) -> None:
    """Handles a player disconnecting during a match."""
    room = get_player_match(user_id)
    if room is None or room.state not in (MatchState.MATCHED, MatchState.COUNTDOWN, MatchState.IN_PROGRESS):
        return

    winner_id = None
    if room.player1 and user_id == room.player1.user_id:
        logger.info("Player {} disconnected from match {}", user_id, room.match_id)
        winner_id = room.player2.user_id if room.player2 else None
    elif room.player2 and user_id == room.player2.user_id:
        logger.info("Player {} disconnected from match {}", user_id, room.match_id)
        winner_id = room.player1.user_id if room.player1 else None

    await end_match(room, "forfeit", winner_id=winner_id)


def _cleanup_match(room: MatchRoom) -> None:
    """Removes the match from active registries."""
    _active_matches.pop(room.match_id, None)
    if room.player1:
        _player_match_map.pop(room.player1.user_id, None)
    if room.player2:
        _player_match_map.pop(room.player2.user_id, None)


async def _cancel_tasks(room: MatchRoom) -> None:
    """Cancels all running asyncio tasks for a match."""
    for task in [room.countdown_task, room.timer_task, room.bot_task]:
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


def _compute_player_stats(player: PlayerState) -> Dict[str, Any]:
    """Computes per-player match statistics."""
    solved = [q for q in player.question_records if q.correct]
    solve_times = []
    for q in solved:
        if q.served_at is not None and q.answered_at is not None:
            solve_times.append((q.answered_at - q.served_at) * 1000)

    return {
        "questions_attempted": player.question_index,
        "avg_solve_time_ms": round(sum(solve_times) / len(solve_times), 1) if solve_times else 0,
        "fastest_solve_time_ms": round(min(solve_times), 1) if solve_times else 0,
    }


_BOT_ADJECTIVES = [
    "Swift", "Clever", "Bright", "Quick", "Sharp",
    "Logic", "Circuit", "Binary", "Neural", "Quantum",
]
_BOT_NOUNS = [
    "Bot", "Engine", "Mind", "Core", "Spark",
    "Solver", "Thinker", "Wizard", "Master", "Agent",
]


def _generate_bot_name() -> str:
    """Generates a fun bot display name."""
    import random
    adj = random.choice(_BOT_ADJECTIVES)
    noun = random.choice(_BOT_NOUNS)
    num = random.randint(10, 99)
    return f"{adj}{noun}{num}"
