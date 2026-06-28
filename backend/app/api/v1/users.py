"""User profile endpoints"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config.database import get_db
from app.core.exceptions import NotFoundError, ValidationError
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


class UserProfileResponse(BaseModel):
    id: str
    username: str
    display_name: str | None
    elo: int
    is_guest: bool
    games_played: int
    games_won: int
    current_streak: int
    best_streak: int

    class Config:
        from_attributes = True


class PublicProfileResponse(BaseModel):
    """Public-facing profile"""
    id: str
    username: str
    display_name: str | None
    elo: int
    games_played: int
    games_won: int
    best_streak: int

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    display_name: str | None = Field(
        None,
        min_length=2,
        max_length=50,
        description="User-chosen display name (2-50 characters)",
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(user: User = Depends(get_current_user)):
    """Get the authenticated user's full profile"""
    return UserProfileResponse(
        id=str(user.id),
        username=user.username,
        display_name=user.display_name,
        elo=user.elo,
        is_guest=user.is_guest,
        games_played=user.games_played,
        games_won=user.games_won,
        current_streak=user.current_streak,
        best_streak=user.best_streak,
    )


@router.patch("/me", response_model=UserProfileResponse)
async def update_my_profile(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated user's display name"""
    if body.display_name is not None:
        clean_name = body.display_name.strip()
        if len(clean_name) < 2:
            raise ValidationError("Display name must be at least 2 characters")
        user.display_name = clean_name

    user.updated_at = datetime.now(timezone.utc)
    db.add(user)

    return UserProfileResponse(
        id=str(user.id),
        username=user.username,
        display_name=user.display_name,
        elo=user.elo,
        is_guest=user.is_guest,
        games_played=user.games_played,
        games_won=user.games_won,
        current_streak=user.current_streak,
        best_streak=user.best_streak,
    )


@router.get("/{user_id}/public", response_model=PublicProfileResponse)
async def get_public_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Gets a user's public profile"""
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise NotFoundError("User", user_id)

    user = await db.get(User, uid)
    if user is None:
        raise NotFoundError("User", user_id)

    return PublicProfileResponse(
        id=str(user.id),
        username=user.username,
        display_name=user.display_name,
        elo=user.elo,
        games_played=user.games_played,
        games_won=user.games_won,
        best_streak=user.best_streak,
    )
