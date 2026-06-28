"""API v1 router — aggregates all v1 sub-routers."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.users import router as users_router
from app.routes.practice import router as practice_router
from app.routes.arena import router as arena_router
from app.routes.mode3_practice import router as mode3_practice_router
from app.routes.daily import router as daily_router
from app.routes.leaderboard import router as leaderboard_router

v1_router = APIRouter(prefix="/api/v1")

v1_router.include_router(auth_router)
v1_router.include_router(users_router)

# Health is also mounted at root level in main.py,
# but available under /api/v1/health too
v1_router.include_router(health_router)

# WebSocket routes for game modes
v1_router.include_router(practice_router)
v1_router.include_router(arena_router)
v1_router.include_router(mode3_practice_router)

v1_router.include_router(daily_router)

v1_router.include_router(leaderboard_router)