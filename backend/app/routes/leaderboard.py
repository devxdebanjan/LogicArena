"""Global Leaderboard API route"""

import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc

from app.config.database import get_db
from app.config.redis import get_redis_pool
from app.models.user import User

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

CACHE_KEY = "leaderboard:global"
CACHE_TTL = 300


@router.get("")
async def get_global_leaderboard(db: AsyncSession = Depends(get_db)):
    """Fetches the global Elo leaderboard"""
    redis = get_redis_pool()
    
    cached = await redis.get(CACHE_KEY)
    if cached:
        return json.loads(cached)
        
    query = (
        select(User)
        .where(User.games_played > 5)
        .order_by(desc(User.elo))
        .limit(50)
    )
    result = await db.execute(query)
    users = result.scalars().all()
    
    leaderboard = [
        {
            "id": str(u.id),
            "username": u.username,
            "display_name": u.display_name,
            "elo": u.elo,
            "games_played": u.games_played,
            "games_won": u.games_won,
            "best_streak": u.best_streak,
        }
        for u in users
    ]
    
    await redis.set(CACHE_KEY, json.dumps(leaderboard), ex=CACHE_TTL)
    
    return leaderboard
