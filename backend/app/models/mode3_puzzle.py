"""Mode 3 Crossword Puzzle Model."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    """Returns the current UTC datetime."""
    return datetime.now(timezone.utc)


class Mode3Puzzle(SQLModel, table=True):
    """A Mode 3 Crossword Puzzle."""

    __tablename__ = "mode3_puzzles"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    
    difficulty: str = Field(
        max_length=20,
        description="Difficulty level: e.g. EASY, MEDIUM, HARD",
        index=True
    )
    
    grid_width: int = Field(default=3, index=True)
    grid_height: int = Field(default=3, index=True)
    num_gates: int = Field(default=0, index=True)
    num_holes: int = Field(default=0, index=True)
    bit_width: int = Field(default=2, index=True)

    puzzle_data: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=sa.Column(JSONB, nullable=False),
        description="Stores grid layout, cells, connections, and inventory."
    )
    
    is_daily: bool = Field(
        default=False,
        index=True,
        description="Flag indicating if this puzzle is selected for the Daily Challenge."
    )
    
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=sa.Column(
            sa.DateTime(timezone=True),
            nullable=False,
        ),
    )
