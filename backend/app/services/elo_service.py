"""Elo rating service."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, TYPE_CHECKING

from loguru import logger

from app.config.database import async_session_factory
from app.engine.elo import calculate_elo_change, calculate_draw_elo, get_k_factor
from app.models.match import Match
from app.models.user import User

if TYPE_CHECKING:
    from app.services.match_manager import MatchRoom


async def update_elo_after_match(
    room: "MatchRoom",
    winner_id: Optional[str],
    reason: str,
) -> Dict[str, Any]:
    """Update Elo ratings and persist match results."""
    p1 = room.player1
    p2 = room.player2

    p1_elo_before = p1.elo
    p2_elo_before = p2.elo
    p1_elo_after = p1_elo_before
    p2_elo_after = p2_elo_before

    is_friend = room.is_friend_match
    is_bot = room.is_bot_match

    async with async_session_factory() as db:
        if not is_friend:
            if winner_id is not None:
                if winner_id == p1.user_id:
                    w_elo, l_elo = p1_elo_before, p2_elo_before
                    w_games = await _get_games_played(db, p1.user_id)
                    l_games = await _get_games_played(db, p2.user_id) if not is_bot else 0
                    w_k = get_k_factor(w_games, w_elo)
                    l_k = get_k_factor(l_games, l_elo)
                    p1_elo_after, p2_elo_after = calculate_elo_change(
                        w_elo, l_elo, w_k, l_k
                    )
                else:
                    w_elo, l_elo = p2_elo_before, p1_elo_before
                    w_games = await _get_games_played(db, p2.user_id) if not is_bot else 0
                    l_games = await _get_games_played(db, p1.user_id)
                    w_k = get_k_factor(w_games, w_elo)
                    l_k = get_k_factor(l_games, l_elo)
                    p2_elo_after, p1_elo_after = calculate_elo_change(
                        w_elo, l_elo, w_k, l_k
                    )
            else:
                p1_games = await _get_games_played(db, p1.user_id)
                p2_games = await _get_games_played(db, p2.user_id) if not is_bot else 0
                p1_k = get_k_factor(p1_games, p1_elo_before)
                p2_k = get_k_factor(p2_games, p2_elo_before)
                p1_elo_after, p2_elo_after = calculate_draw_elo(
                    p1_elo_before, p2_elo_before, p1_k, p2_k
                )

        p1_user = await db.get(User, uuid.UUID(p1.user_id))
        if p1_user:
            p1_user.games_played += 1
            if not is_friend:
                p1_user.elo = p1_elo_after
            if winner_id == p1.user_id:
                p1_user.games_won += 1
            p1_user.updated_at = datetime.now(timezone.utc)
            db.add(p1_user)

        if not is_bot:
            p2_user = await db.get(User, uuid.UUID(p2.user_id))
            if p2_user:
                p2_user.games_played += 1
                if not is_friend:
                    p2_user.elo = p2_elo_after
                if winner_id == p2.user_id:
                    p2_user.games_won += 1
                p2_user.updated_at = datetime.now(timezone.utc)
                db.add(p2_user)

        match_record = Match(
            mode=room.mode,
            player1_id=uuid.UUID(p1.user_id),
            player2_id=uuid.UUID(p2.user_id) if not is_bot else None,
            is_bot_match=is_bot,
            is_friend_match=is_friend,
            player1_score=p1.score,
            player2_score=p2.score,
            winner_id=uuid.UUID(winner_id) if winner_id and not is_bot else None,
            result=reason,
            player1_elo_before=p1_elo_before,
            player1_elo_after=p1_elo_after,
            player2_elo_before=p2_elo_before,
            player2_elo_after=p2_elo_after,
            duration_seconds=60,
            match_data={
                "p1_solved": getattr(p1, "questions_solved", 1 if getattr(p1, "solved", False) else 0),
                "p2_solved": getattr(p2, "questions_solved", 1 if getattr(p2, "solved", False) else 0),
                "p1_attempted": getattr(p1, "question_index", 1),
                "p2_attempted": getattr(p2, "question_index", 1),
            },
            completed_at=datetime.now(timezone.utc),
        )
        db.add(match_record)

        await db.commit()

    logger.info(
        "Elo updated for match {}: P1 {} → {}, P2 {} → {} (friend={}, bot={})",
        room.match_id,
        p1_elo_before, p1_elo_after,
        p2_elo_before, p2_elo_after,
        is_friend, is_bot,
    )

    return {
        "p1_elo_before": p1_elo_before,
        "p1_elo_after": p1_elo_after,
        "p2_elo_before": p2_elo_before,
        "p2_elo_after": p2_elo_after,
    }


async def _get_games_played(db, user_id: str) -> int:
    """Get a player's games_played count from DB."""
    try:
        user = await db.get(User, uuid.UUID(user_id))
        return user.games_played if user else 0
    except Exception:
        return 0
