"""Shared FastAPI dependencies"""

from __future__ import annotations

import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.exceptions import AuthenticationError
from app.core.security import decode_access_token
from app.models.user import User

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decodes JWT and fetches the corresponding User."""
    if credentials is None:
        raise AuthenticationError("Missing authentication token")

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError as e:
        raise AuthenticationError(f"Invalid token: {e}")

    user_id = payload.get("sub")
    if user_id is None:
        raise AuthenticationError("Token missing user identifier")

    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise AuthenticationError("Invalid user identifier in token")

    user = await db.get(User, uid)
    if user is None:
        raise AuthenticationError("User not found")

    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Gets the current user or returns None if unauthenticated."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials=credentials, db=db)
    except AuthenticationError:
        return None
