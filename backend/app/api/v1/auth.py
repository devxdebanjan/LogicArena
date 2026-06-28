"""Auth endpoints — guest signup, token refresh, logout, and Google OAuth."""

from __future__ import annotations

import uuid
import json
import urllib.request
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response
from loguru import logger
from pydantic import BaseModel
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config.database import get_db
from app.config.redis import get_redis
from app.config.settings import settings
from app.core.exceptions import AuthenticationError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    revoke_refresh_token,
    store_refresh_token,
    validate_refresh_token,
)
from app.models.user import User
from app.services.name_generator import generate_unique_username

router = APIRouter(prefix="/auth", tags=["auth"])

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
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


class GuestSignupResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class GoogleAuthRequest(BaseModel):
    id_token: str


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Sets the refresh token as an httpOnly cookie."""
    is_prod = settings.is_production
    cookie_parts = [
        f"refresh_token={token}",
        f"Max-Age={settings.REFRESH_TOKEN_EXPIRE_DAYS * 86_400}",
        "Path=/api/v1/auth",
        "HttpOnly",
    ]
    if is_prod:
        cookie_parts.append("Secure")
        cookie_parts.append("SameSite=None")
        cookie_parts.append("Partitioned")
    else:
        cookie_parts.append("SameSite=Lax")
    
    cookie_str = "; ".join(cookie_parts)
    response.headers.append("Set-Cookie", cookie_str)


def _clear_refresh_cookie(response: Response) -> None:
    """Clears the refresh token cookie."""
    is_prod = settings.is_production
    cookie_parts = [
        "refresh_token=",
        "Max-Age=0",
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        "Path=/api/v1/auth",
        "HttpOnly",
    ]
    if is_prod:
        cookie_parts.append("Secure")
        cookie_parts.append("SameSite=None")
        cookie_parts.append("Partitioned")
    else:
        cookie_parts.append("SameSite=Lax")
    
    cookie_str = "; ".join(cookie_parts)
    response.headers.append("Set-Cookie", cookie_str)


@router.post("/guest", response_model=GuestSignupResponse, status_code=201)
async def guest_signup(
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    username = await generate_unique_username(db)

    user = User(
        username=username,
        is_guest=True,
        elo=1000,
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token(user_id=user.id, is_guest=True)
    refresh_token = generate_refresh_token()

    await store_refresh_token(redis, refresh_token, user.id)

    _set_refresh_cookie(response, refresh_token)

    logger.info("Guest signup: user={} name={}", user.id, username)

    return GuestSignupResponse(
        user=UserResponse(
            id=str(user.id),
            username=user.username,
            display_name=user.display_name,
            elo=user.elo,
            is_guest=user.is_guest,
            games_played=user.games_played,
            games_won=user.games_won,
            current_streak=user.current_streak,
            best_streak=user.best_streak,
        ),
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise AuthenticationError("No refresh token cookie")

    user_id = await validate_refresh_token(redis, raw_token)
    if user_id is None:
        _clear_refresh_cookie(response)
        raise AuthenticationError("Refresh token expired or invalid")

    user = await db.get(User, uuid.UUID(user_id))
    if user is None:
        await revoke_refresh_token(redis, raw_token)
        _clear_refresh_cookie(response)
        raise AuthenticationError("User no longer exists")

    user.last_active_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    db.add(user)

    access_token = create_access_token(user_id=user.id, is_guest=user.is_guest)

    logger.debug("Token refreshed for user {}", user.id)

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Revokes the refresh token and clears the cookie."""
    raw_token = request.cookies.get("refresh_token")
    if raw_token:
        await revoke_refresh_token(redis, raw_token)

    _clear_refresh_cookie(response)

    logger.info("User {} logged out", user.id)

    return {"detail": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Gets the current authenticated user's profile."""
    return UserResponse(
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


def _verify_google_token(id_token: str) -> dict | None:
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            if "error" in data:
                return None
            return data
    except Exception as e:
        logger.error(f"Failed to verify Google token: {e}")
        return None


@router.post("/google", response_model=GuestSignupResponse)
async def google_auth(
    body: GoogleAuthRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    google_data = _verify_google_token(body.id_token)
    if google_data is None:
        raise AuthenticationError("Invalid or expired Google token")

    if settings.GOOGLE_CLIENT_ID:
        token_aud = google_data.get("aud")
        if token_aud != settings.GOOGLE_CLIENT_ID:
            logger.error("Google token audience mismatch. Expected: {}, Got: {}", settings.GOOGLE_CLIENT_ID, token_aud)
            raise AuthenticationError("Invalid Google token audience")

    google_id = google_data.get("sub")
    email = google_data.get("email")
    name = google_data.get("name")
    
    stmt = select(User).where(User.google_id == google_id)
    user = (await db.execute(stmt)).scalars().first()
    
    current_user = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from app.core.security import decode_access_token
            payload = decode_access_token(token)
            user_id = payload.get("sub")
            if user_id:
                current_user = await db.get(User, uuid.UUID(user_id))
        except Exception:
            pass
            
    if user is None:
        if current_user and current_user.is_guest and current_user.google_id is None:
            user = current_user
            user.google_id = google_id
            user.is_guest = False
            if name:
                user.display_name = name
            db.add(user)
            await db.commit()
            logger.info("Upgraded guest user {} to Google account {}", user.id, google_id)
        else:
            username = await generate_unique_username(db)
            user = User(
                username=username,
                display_name=name,
                is_guest=False,
                google_id=google_id,
                elo=1000
            )
            db.add(user)
            await db.commit()
            logger.info("Created new Google user {}", user.id)
    else:
        user.last_active_at = datetime.now(timezone.utc)
        db.add(user)
        await db.commit()
        logger.info("Logged in existing Google user {}", user.id)
        
    access_token = create_access_token(user_id=user.id, is_guest=user.is_guest)
    refresh_token = generate_refresh_token()
    
    await store_refresh_token(redis, refresh_token, user.id)
    
    _set_refresh_cookie(response, refresh_token)
    
    return GuestSignupResponse(
        user=UserResponse(
            id=str(user.id),
            username=user.username,
            display_name=user.display_name,
            elo=user.elo,
            is_guest=user.is_guest,
            games_played=user.games_played,
            games_won=user.games_won,
            current_streak=user.current_streak,
            best_streak=user.best_streak,
        ),
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
