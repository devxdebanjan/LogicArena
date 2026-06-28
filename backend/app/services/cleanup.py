"""Guest account cleanup."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from loguru import logger
from sqlalchemy import delete

from app.config.database import async_session_factory
from app.config.settings import settings
from app.models.user import User

CLEANUP_INTERVAL_SECONDS = 86_400


async def guest_cleanup_loop() -> None:
    """Periodically deletes inactive guest accounts."""
    logger.info(
        "Guest cleanup task started (interval={}s, threshold={}d)",
        CLEANUP_INTERVAL_SECONDS,
        settings.GUEST_CLEANUP_DAYS,
    )

    await asyncio.sleep(60)

    while True:
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(days=settings.GUEST_CLEANUP_DAYS)

            async with async_session_factory() as session:
                stmt = (
                    delete(User)
                    .where(User.is_guest == True)  # noqa: E712
                    .where(User.last_active_at < cutoff)
                )
                result = await session.execute(stmt)
                await session.commit()
                deleted_count = result.rowcount

            if deleted_count > 0:
                logger.info(
                    "Guest cleanup: deleted {} inactive accounts (cutoff={})",
                    deleted_count,
                    cutoff.isoformat(),
                )
            else:
                logger.debug("Guest cleanup: no inactive accounts to delete")

        except asyncio.CancelledError:
            logger.info("Guest cleanup task cancelled")
            break
        except Exception as e:
            logger.error("Guest cleanup task error: {}", e)

        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
