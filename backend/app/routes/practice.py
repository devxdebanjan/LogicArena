"""Practice Match WebSocket endpoint"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, HTTPException
from jose import JWTError
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import async_session_factory
from app.core.security import decode_access_token
from app.services.game_service import (
    MATCH_DURATION_SECONDS,
    PracticeMatchSession,
    prepare_match,
    submit_answer,
    _serialize_question,
)

router = APIRouter(tags=["practice"])


@router.get("/practice/questions")
async def get_practice_questions(
    mode: int = Query(default=2),
):
    # Fetches a full set of 20 practice questions for Mode 1 or Mode 2
    async with async_session_factory() as db:
        try:
            session = await prepare_match(db, mode=mode)
            return {
                "match_id": session.match_id,
                "questions": [_serialize_question(q) for q in session.questions],
                "total_questions": len(session.questions),
                "duration_seconds": MATCH_DURATION_SECONDS
            }
        except Exception as e:
            logger.exception("Failed to prepare practice questions")
            raise HTTPException(status_code=500, detail=str(e))


async def _authenticate_ws(token: str | None) -> str | None:
    # Validates a JWT token from the WebSocket query param
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        return payload.get("sub")
    except JWTError:
        return None


@router.websocket("/ws/practice")
async def practice_ws(
    websocket: WebSocket,
    mode: int = Query(default=2),
    token: str | None = Query(default=None),
):
    # WebSocket handler for practice matches
    user_id = await _authenticate_ws(token)
    if user_id is None:
        user_id = f"anon-{__import__('uuid').uuid4().hex[:8]}"

    await websocket.accept()
    logger.info("Practice WS connected: user={} mode={}", user_id, mode)

    session: PracticeMatchSession | None = None
    timer_task: asyncio.Task | None = None

    async def _end_match(reason: str = "timer_expired") -> None:
        # Ends the match and sends stats
        nonlocal session
        if session is None or not session.is_active:
            return
        session.mark_ended()
        stats = session.compute_stats()
        try:
            await websocket.send_json({
                "type": "match_ended",
                "reason": reason,
                "stats": stats,
            })
        except Exception:
            pass
        logger.info(
            "Match {} ended ({}): score={}/{}",
            session.match_id, reason, stats["score"], stats["questions_solved"],
        )

    async def _timer_loop() -> None:
        # Runs the server-side authoritative timer
        await asyncio.sleep(MATCH_DURATION_SECONDS + 1.5)
        await _end_match("timer_expired")

    try:
        while True:
            raw = await websocket.receive_json()
            msg_type = raw.get("type")

            if msg_type == "start_match":
                if session is not None and session.is_active:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Match already in progress",
                    })
                    continue

                await websocket.send_json({"type": "match_loading"})

                async with async_session_factory() as db:
                    try:
                        session = await prepare_match(db, mode=mode)
                    except RuntimeError as e:
                        await websocket.send_json({
                            "type": "error",
                            "message": str(e),
                        })
                        continue

                session.mark_started()
                first_q = session.get_current_question()
                if first_q is not None:
                    first_q.served_at = session.started_at

                await websocket.send_json({
                    "type": "match_started",
                    "match_id": session.match_id,
                    "question": _serialize_question(first_q) if first_q else None,
                    "total_questions": len(session.questions),
                    "duration_seconds": MATCH_DURATION_SECONDS,
                })

                timer_task = asyncio.create_task(_timer_loop())

            elif msg_type == "submit_answer":
                if session is None or not session.is_active:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No active match",
                    })
                    continue

                user_answer = str(raw.get("answer", ""))
                q_index = raw.get("question_index", -1)

                result = submit_answer(session, user_answer, q_index)

                if "error" in result:
                    await websocket.send_json({
                        "type": "error",
                        "message": result["error"],
                    })
                    continue

                await websocket.send_json({
                    "type": "answer_result",
                    **result,
                })

                if not result["has_more"]:
                    if timer_task is not None:
                        timer_task.cancel()
                    await _end_match("all_questions_answered")

            elif msg_type == "resign":
                if session is None or not session.is_active:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No active match",
                    })
                    continue

                if timer_task is not None:
                    timer_task.cancel()
                await _end_match("resigned")

            elif msg_type == "pong":
                pass

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        logger.info("Practice WS disconnected: user={}", user_id)
    except Exception as e:
        logger.error("Practice WS error for user={}: {}", user_id, e)
    finally:
        if timer_task is not None and not timer_task.done():
            timer_task.cancel()
            try:
                await timer_task
            except asyncio.CancelledError:
                pass
        if session is not None and session.is_active:
            session.mark_ended()
        logger.info("Practice WS cleanup done: user={}", user_id)
