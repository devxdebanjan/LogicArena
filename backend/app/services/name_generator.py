"""Fun name generator for guest accounts."""

from __future__ import annotations

import random

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

ADJECTIVES = [
    "Swift", "Bright", "Clever", "Bold", "Cosmic",
    "Daring", "Fierce", "Glowing", "Hidden", "Iron",
    "Jolly", "Keen", "Lucky", "Mighty", "Noble",
    "Pixel", "Quick", "Rapid", "Silent", "Turbo",
    "Ultra", "Vivid", "Wired", "Zippy", "Astral",
    "Binary", "Cyber", "Digital", "Ember", "Flash",
    "Golden", "Hyper", "Ionic", "Jade", "Kinetic",
    "Lunar", "Mystic", "Neon", "Omega", "Primal",
    "Quantum", "Rogue", "Sonic", "Thunder", "Void",
    "Warp", "Xenon", "Zephyr", "Atomic", "Blaze",
    "Chill", "Drift", "Echo", "Frost", "Gleam",
    "Haze", "Ivory", "Jet", "Knightly", "Laser",
]

NOUNS = [
    "Falcon", "Comet", "Phoenix", "Dragon", "Tiger",
    "Panther", "Hawk", "Wolf", "Viper", "Raven",
    "Lynx", "Fox", "Eagle", "Bear", "Lion",
    "Shark", "Cobra", "Mantis", "Spark", "Storm",
    "Blitz", "Pulse", "Nova", "Byte", "Node",
    "Core", "Flux", "Wave", "Bolt", "Surge",
    "Cipher", "Vector", "Matrix", "Prism", "Orbit",
    "Crest", "Ridge", "Forge", "Helm", "Shard",
    "Blade", "Nexus", "Apex", "Zenith", "Titan",
    "Atlas", "Rover", "Pilot", "Scout", "Knight",
    "Sage", "Mage", "Ace", "Dash", "Glyph",
    "Rune", "Fang", "Claw", "Wing", "Star",
]

_used_pairs: set[str] = set()


def _generate_candidate() -> str:
    """Generates a single name candidate."""
    adj = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    suffix = random.randint(1000, 9999)
    return f"{adj}{noun}{suffix}"


async def generate_unique_username(db: AsyncSession, max_attempts: int = 20) -> str:
    """Generates a fun username that doesn't exist in the database."""
    for _ in range(max_attempts):
        candidate = _generate_candidate()

        pair_key = candidate[:-4]
        if pair_key in _used_pairs and random.random() > 0.1:
            continue

        stmt = select(User.id).where(User.username == candidate).limit(1)
        result = await db.execute(stmt)
        if result.scalar_one_or_none() is None:
            _used_pairs.add(pair_key)
            return candidate

    import uuid
    return f"Player{str(uuid.uuid4())[:8].upper()}"
