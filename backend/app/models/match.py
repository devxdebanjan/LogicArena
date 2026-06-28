"""Match model."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import sqlalchemy as sa
from sqlmodel import Field, SQLModel, JSON


def _utcnow() -> datetime:
    """Returns the current UTC datetime."""
    return datetime.now(timezone.utc)


class Match(SQLModel, table=True):
    """A completed LogicArena match."""

    __tablename__ = "matches"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    mode: int = Field(
        index=True,
        description="Game mode: 1, 2, or 3",
    )

    player1_id: uuid.UUID = Field(
        foreign_key="users.id",
        index=True,
        description="First player (always the human in bot matches)",
    )
    player2_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="users.id",
        index=True,
        description="Second player — None for bot matches",
    )

    is_bot_match: bool = Field(default=False)
    is_friend_match: bool = Field(default=False)

    player1_score: int = Field(default=0)
    player2_score: int = Field(default=0)
    winner_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Winner's user_id — None for draws or bot wins",
    )
    result: str = Field(
        default="completed",
        description="Match outcome: completed, forfeit, draw",
    )

    player1_elo_before: int = Field(default=0)
    player1_elo_after: int = Field(default=0)
    player2_elo_before: int = Field(
        default=0,
        description="Bot's ephemeral Elo for bot matches",
    )
    player2_elo_after: int = Field(
        default=0,
        description="Bot's Elo after — same as before for bots (not persisted)",
    )

    duration_seconds: int = Field(default=60)
    match_data: Dict[str, Any] = Field(
        default_factory=dict,
        sa_type=JSON,
        description="JSONB — per-question breakdown, solve times, etc.",
    )

    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=sa.Column(
            sa.DateTime(timezone=True),
            nullable=False,
        ),
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        sa_column=sa.Column(
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
