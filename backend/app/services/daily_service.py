"""Daily Puzzle service logic."""

import asyncio
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.models.mode3_puzzle import Mode3Puzzle

logger = logging.getLogger(__name__)

async def rotate_daily_puzzle(db: AsyncSession, redis) -> None:
    """Selects a random HARD/MEDIUM Mode 3 puzzle for today and caches it in Redis."""
    today_str = datetime.now(timezone.utc).date().isoformat()
    
    lock_key = "daily_puzzle:rotation_lock"
    is_locked = await redis.set(lock_key, "1", ex=10, nx=True)
    if not is_locked:
        logger.info("Daily puzzle rotation lock is active; waiting.")
        for _ in range(5):
            await asyncio.sleep(0.5)
            existing_date = await redis.get("daily_puzzle:date")
            if existing_date == today_str:
                return

    try:
        existing_date = await redis.get("daily_puzzle:date")
        if existing_date == today_str:
            return

        result = await db.execute(
            select(Mode3Puzzle)
            .where(Mode3Puzzle.difficulty.in_(["MEDIUM", "HARD"]))
            .order_by(func.random())
            .limit(1)
        )
        puzzle = result.scalar_one_or_none()
        
        if not puzzle:
            logger.error("No suitable puzzles found in database for Daily Challenge.")
            return
            
        puzzle_id_str = str(puzzle.id)
        
        payload = {
            "id": puzzle_id_str,
            "difficulty": puzzle.difficulty,
            "grid_width": puzzle.grid_width,
            "grid_height": puzzle.grid_height,
            "puzzle_data": puzzle.puzzle_data
        }
        
        await redis.set("daily_puzzle:date", today_str)
        await redis.set("daily_puzzle:id", puzzle_id_str)
        await redis.set("daily_puzzle:payload", json.dumps(payload))
        
        logger.info(f"Selected daily puzzle {puzzle_id_str} for {today_str} on-demand.")
    except Exception as e:
        logger.error(f"Failed to select daily puzzle: {e}")
    finally:
        await redis.delete(lock_key)
