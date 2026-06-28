"""JWT access tokens and Redis-backed refresh tokens."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from loguru import logger

from app.config.settings import settings

REFRESH_KEY_PREFIX = "refresh:"
REFRESH_TTL_SECONDS = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86_400


def create_access_token(
    user_id: str | uuid.UUID,
    is_guest: bool = True,
    extra_claims: dict | None = None,
) -> str:
    """Creates a signed JWT access token."""
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),
        "is_guest": is_guest,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    if extra_claims:
        claims.update(extra_claims)
    return jwt.encode(
        claims,
        settings.JWT_SECRET_KEY.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("sub") is None:
            raise JWTError("Token missing 'sub' claim")
        return payload
    except JWTError:
        raise


def generate_refresh_token() -> str:
    """Generates a cryptographically random refresh token (UUID4)."""
    return str(uuid.uuid4())


def _hash_token(token: str) -> str:
    """Hashes the raw token using SHA-256 for Redis storage."""
    return hashlib.sha256(token.encode()).hexdigest()


async def store_refresh_token(
    redis,
    raw_token: str,
    user_id: str | uuid.UUID,
) -> None:
    """Stores a refresh token hash in Redis with a sliding TTL."""
    key = f"{REFRESH_KEY_PREFIX}{_hash_token(raw_token)}"
    await redis.set(key, str(user_id), ex=REFRESH_TTL_SECONDS)
    logger.debug("Stored refresh token for user {}", user_id)


async def validate_refresh_token(
    redis,
    raw_token: str,
) -> str | None:
    """Validates a refresh token and returns the associated user_id."""
    key = f"{REFRESH_KEY_PREFIX}{_hash_token(raw_token)}"
    user_id = await redis.get(key)
    if user_id is None:
        return None
    await redis.expire(key, REFRESH_TTL_SECONDS)
    return user_id


async def revoke_refresh_token(redis, raw_token: str) -> None:
    """Revokes a refresh token by deleting its hash from Redis."""
    key = f"{REFRESH_KEY_PREFIX}{_hash_token(raw_token)}"
    await redis.delete(key)
    logger.debug("Revoked refresh token")


async def revoke_all_user_tokens(redis, user_id: str | uuid.UUID) -> int:
    """Revokes all refresh tokens for a user."""
    pattern = f"{REFRESH_KEY_PREFIX}*"
    count = 0
    async for key in redis.scan_iter(match=pattern, count=100):
        stored_user_id = await redis.get(key)
        if stored_user_id == str(user_id):
            await redis.delete(key)
            count += 1
    logger.info("Revoked {} refresh tokens for user {}", count, user_id)
    return count
