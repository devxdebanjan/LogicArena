"""Mode 3 Practice Routes"""

from __future__ import annotations

import uuid
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import sqlalchemy as sa
from sqlalchemy.sql.expression import func

from app.config.database import get_db
from app.engine.mode3_logic_engine import generate_puzzle, evaluate_mode3_solution
from app.models.mode3_puzzle import Mode3Puzzle

router = APIRouter(prefix="/mode3/practice", tags=["mode3", "practice"])


class VerifyRequest(BaseModel):
    user_answers: Dict[str, str]


@router.get("/random")
async def get_random_puzzle(
    db: AsyncSession = Depends(get_db)
):
    # Fetches a random puzzle from the database
    result = await db.execute(
        sa.select(Mode3Puzzle).order_by(func.random()).limit(1)
    )
    puzzle = result.scalar_one_or_none()
    
    if not puzzle:
        gen_result = generate_puzzle()
        puzzle = Mode3Puzzle(
            difficulty="MEDIUM", 
            grid_width=gen_result["metadata"]["grid_width"],
            grid_height=gen_result["metadata"]["grid_height"],
            num_gates=gen_result["metadata"]["num_gates"],
            num_holes=gen_result["metadata"]["num_holes"],
            bit_width=gen_result["metadata"]["bit_width"],
            puzzle_data=gen_result["puzzle_data"]
        )
        db.add(puzzle)
        await db.commit()
        await db.refresh(puzzle)
        
    return {
        "id": puzzle.id,
        "difficulty": puzzle.difficulty,
        "puzzle_data": puzzle.puzzle_data
    }


@router.post("/{puzzle_id}/verify")
async def verify_solution(
    puzzle_id: uuid.UUID,
    req: VerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verifies the user's solution for the given puzzle"""
    puzzle = await db.get(Mode3Puzzle, puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
        
    is_correct = evaluate_mode3_solution(puzzle.puzzle_data, req.user_answers)
    
    return {
        "is_correct": is_correct,
        "detail": "Circuit evaluated successfully." if is_correct else "Incorrect logic or outputs do not match."
    }
