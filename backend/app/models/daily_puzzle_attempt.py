"""Daily Puzzle Attempt Model."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    """Returns the current UTC datetime."""
    return datetime.now(timezone.utc)

def _today() -> date:
    """Returns the current UTC date."""
    return datetime.now(timezone.utc).date()


class DailyPuzzleAttempt(SQLModel, table=True):
    """Tracks a user's attempt at solving a daily puzzle."""

    __tablename__ = "daily_puzzle_attempts"
    
    __table_args__ = (
        sa.UniqueConstraint("user_id", "attempt_date", name="uix_user_daily_attempt"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        index=True,
        nullable=False,
    )
    
    puzzle_id: uuid.UUID = Field(
        foreign_key="mode3_puzzles.id",
        index=True,
        nullable=False,
    )
    
    attempt_date: date = Field(
        default_factory=_today,
        index=True,
        nullable=False,
        description="The UTC date this puzzle was the daily puzzle."
    )
    
    solve_time_ms: int = Field(
        nullable=False,
        index=True,
        description="Time taken to solve the puzzle in milliseconds."
    )
    
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=sa.Column(
            sa.DateTime(timezone=True),
            nullable=False,
        ),
    )
