"""User model."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    """Returns the current UTC datetime."""
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    """A LogicArena player account."""

    __tablename__ = "users"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    username: str = Field(
        index=True,
        unique=True,
        max_length=40,
        description="Auto-generated fun name (e.g. SwiftFalcon2847)",
    )
    display_name: str | None = Field(
        default=None,
        max_length=50,
        description="Optional user-chosen display name",
    )

    is_guest: bool = Field(default=True, description="Guest or Google-linked account")
    google_id: str | None = Field(
        default=None,
        unique=True,
        index=True,
        description="Google OAuth subject ID — null for guests",
    )

    elo: int = Field(default=1000, index=True, description="Elo rating for matchmaking")
    games_played: int = Field(default=0)
    games_won: int = Field(default=0)
    current_streak: int = Field(default=0)
    best_streak: int = Field(default=0)

    last_active_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=sa.Column(
            sa.DateTime(timezone=True),
            nullable=False,
            index=True,
        ),
        description="Updated on auth refresh — drives cleanup policy",
    )
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=sa.Column(
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        description="Account creation timestamp",
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=sa.Column(
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        description="Auto-updated on any row modification",
    )

