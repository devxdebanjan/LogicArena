"""Daily Puzzle API routes"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.config.database import get_db
from app.config.redis import get_redis_pool
from app.api.deps import get_current_user
from app.models.mode3_puzzle import Mode3Puzzle
from app.models.daily_puzzle_attempt import DailyPuzzleAttempt
from app.models.user import User
from app.engine.mode3_logic_engine import evaluate_mode3_solution

router = APIRouter(prefix="/daily", tags=["daily"])


@router.get("")
async def get_daily_puzzle(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches the daily puzzle, rotating it on-demand"""
    redis = get_redis_pool()
    today_str = datetime.now(timezone.utc).date().isoformat()
    
    cached_date = await redis.get("daily_puzzle:date")
    if not cached_date or cached_date != today_str:
        from app.services.daily_service import rotate_daily_puzzle
        await rotate_daily_puzzle(db, redis)
        
    payload_str = await redis.get("daily_puzzle:payload")
    if not payload_str:
        raise HTTPException(status_code=404, detail="No daily puzzle set for today")
        
    payload = json.loads(payload_str)
    
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(DailyPuzzleAttempt)
        .where(DailyPuzzleAttempt.user_id == user.id)
        .where(func.date(DailyPuzzleAttempt.created_at) == today)
    )
    attempt = result.scalar_one_or_none()
    
    if attempt:
        raise HTTPException(status_code=403, detail="You have already attempted today's puzzle")
        
    return payload


@router.post("/verify")
async def verify_daily_puzzle(
    req: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verifies a solution for the daily puzzle and records the attempt"""
    redis = get_redis_pool()
    daily_id_str = await redis.get("daily_puzzle:id")
    
    if not daily_id_str:
        raise HTTPException(status_code=404, detail="No daily puzzle set")
        
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(DailyPuzzleAttempt)
        .where(DailyPuzzleAttempt.user_id == user.id)
        .where(func.date(DailyPuzzleAttempt.created_at) == today)
    )
    attempt = result.scalar_one_or_none()
    
    if attempt:
        raise HTTPException(status_code=403, detail="Already attempted today")
        
    user_answers = req.get("user_answers", {})
    solve_time_ms = req.get("solve_time_ms")
    
    if solve_time_ms is None or not isinstance(solve_time_ms, int):
        raise HTTPException(status_code=400, detail="solve_time_ms is required")
        
    puzzle_result = await db.execute(
        select(Mode3Puzzle).where(Mode3Puzzle.id == uuid.UUID(daily_id_str))
    )
    puzzle = puzzle_result.scalar_one_or_none()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Daily puzzle not found in DB")
        
    is_correct = evaluate_mode3_solution(puzzle.puzzle_data, user_answers)
    
    new_attempt = DailyPuzzleAttempt(
        user_id=user.id,
        puzzle_id=puzzle.id,
        solve_time_ms=solve_time_ms if is_correct else -1
    )
    db.add(new_attempt)
    
    db_user_result = await db.execute(select(User).where(User.id == user.id))
    db_user = db_user_result.scalar_one_or_none()
    if db_user:
        if is_correct:
            db_user.current_streak += 1
            if db_user.current_streak > db_user.best_streak:
                db_user.best_streak = db_user.current_streak
        else:
            db_user.current_streak = 0
            
    await db.commit()
    
    return {
        "correct": is_correct,
        "solve_time_ms": solve_time_ms if is_correct else -1
    }


@router.get("/leaderboard")
async def get_daily_leaderboard(db: AsyncSession = Depends(get_db)):
    """Returns the top 50 fastest solves for today's daily puzzle"""
    redis = get_redis_pool()
    daily_id_str = await redis.get("daily_puzzle:id")
    
    if not daily_id_str:
        return []
        
    today = datetime.now(timezone.utc).date()
    
    query = (
        select(DailyPuzzleAttempt, User.username, User.display_name)
        .join(User, User.id == DailyPuzzleAttempt.user_id)
        .where(DailyPuzzleAttempt.puzzle_id == uuid.UUID(daily_id_str))
        .where(DailyPuzzleAttempt.solve_time_ms > 0)
        .where(func.date(DailyPuzzleAttempt.created_at) == today)
        .order_by(DailyPuzzleAttempt.solve_time_ms.asc())
        .limit(50)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "username": row.username,
            "display_name": row.display_name,
            "solve_time_ms": row.DailyPuzzleAttempt.solve_time_ms,
            "created_at": row.DailyPuzzleAttempt.created_at
        }
        for row in rows
    ]
