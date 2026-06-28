"""Logic engine & Match state orchestration."""

from __future__ import annotations
import random
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.engine import mode1_logic_engine, mode2_logic_engine
from app.models.mode2_topology import Mode2CircuitTopology

PRACTICE_QUESTION_COUNT = 20
MATCH_DURATION_SECONDS = 60


@dataclass
class QuestionRecord:
    """Tracks a single question within a match."""
    index: int
    circuit: Dict[str, Any]
    token: str
    served_at: Optional[float] = None
    answered_at: Optional[float] = None
    user_answer: Optional[str] = None
    correct: bool = False


@dataclass
class PracticeMatchSession:
    """State of a single practice match."""
    match_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    mode: int = 2
    questions: List[QuestionRecord] = field(default_factory=list)
    current_index: int = 0
    score: int = 0
    started_at: Optional[float] = None
    ended_at: Optional[float] = None

    @property
    def is_active(self) -> bool:
        return self.started_at is not None and self.ended_at is None

    def mark_started(self) -> None:
        self.started_at = time.monotonic()

    def mark_ended(self) -> None:
        self.ended_at = time.monotonic()

    def get_current_question(self) -> Optional[QuestionRecord]:
        if self.current_index < len(self.questions):
            return self.questions[self.current_index]
        return None

    def compute_stats(self) -> Dict[str, Any]:
        """Computes post-match statistics."""
        solved = [q for q in self.questions if q.correct]
        solve_times = []
        for q in solved:
            if q.served_at is not None and q.answered_at is not None:
                solve_times.append((q.answered_at - q.served_at) * 1000)

        return {
            "score": self.score,
            "questions_solved": len(solved),
            "questions_attempted": self.current_index,
            "total_questions": len(self.questions),
            "solve_percentage": round((len(solved) / self.current_index) * 100, 1) if self.current_index > 0 else 0,
            "avg_solve_time_ms": round(sum(solve_times) / len(solve_times), 1) if solve_times else 0,
            "fastest_solve_time_ms": round(min(solve_times), 1) if solve_times else 0,
        }


async def prepare_match(db: AsyncSession, mode: int = 2) -> PracticeMatchSession:
    """Fetches random topologies from the DB and generates question payloads."""
    session = PracticeMatchSession(mode=mode)

    if mode == 1:
        stmt_mode1 = select(Mode2CircuitTopology).where(Mode2CircuitTopology.num_gates >= 2)
        mode1_available = list((await db.execute(stmt_mode1)).scalars().all())
        mode1_topologies = random.choices(mode1_available, k=PRACTICE_QUESTION_COUNT) if mode1_available else []
        topologies = mode1_topologies
    elif mode == 2:
        stmt_easy = select(Mode2CircuitTopology).where(Mode2CircuitTopology.difficulty == "easy")
        easy_available = list((await db.execute(stmt_easy)).scalars().all())
        easy_topologies = random.choices(easy_available, k=PRACTICE_QUESTION_COUNT) if easy_available else []
        topologies = easy_topologies
    else:
        logger.error(f"Unsupported mode: {mode}")
        raise ValueError(f"Unsupported mode: {mode}")

    random.shuffle(topologies)

    if not topologies:
        logger.error("No Mode 2 topologies in database — run the seed script first")
        raise RuntimeError("No Mode 2 topologies in database — run the seed script first")

    logger.info(
        "Preparing match {} with {} topologies",
        session.match_id,
        len(topologies),
    )

    engine = mode1_logic_engine if mode == 1 else mode2_logic_engine

    for idx, topo in enumerate(topologies):
        payload = engine.generate_question_payload(topo.topology_data)
        
        circuit_payload = payload["circuit"]
        if mode == 1:
            circuit_payload["wire_values"] = payload.get("wire_values", {})
            
        session.questions.append(
            QuestionRecord(
                index=idx,
                circuit=circuit_payload,
                token=payload["token"],
            )
        )

    return session


def submit_answer(
    session: PracticeMatchSession,
    user_answer: str,
    question_index: int,
) -> Dict[str, Any]:
    """Validates an answer and advances to the next question."""
    if not session.is_active:
        return {"error": "Match is not active"}

    if question_index != session.current_index:
        return {"error": f"Expected question {session.current_index}, got {question_index}"}

    question = session.get_current_question()
    if question is None:
        return {"error": "No more questions"}

    now = time.monotonic()
    question.answered_at = now
    question.user_answer = user_answer

    engine = mode1_logic_engine if session.mode == 1 else mode2_logic_engine

    correct = engine.verify_answer(user_answer, question.token)
    question.correct = correct
    if correct:
        session.score += 1
    else:
        session.score -= 2

    session.current_index += 1
    next_q = session.get_current_question()

    if next_q is not None:
        next_q.served_at = time.monotonic()

    return {
        "correct": correct,
        "score": session.score,
        "question_index": question_index,
        "next_question": _serialize_question(next_q) if next_q else None,
        "has_more": next_q is not None,
    }


def _serialize_question(q: QuestionRecord) -> Dict[str, Any]:
    """Serializes a question for sending over WebSocket."""
    return {
        "index": q.index,
        "circuit": q.circuit,
        "token": q.token,
    }
