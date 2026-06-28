"""Bot opponent server-side simulation."""

from __future__ import annotations

import asyncio
import random
from typing import TYPE_CHECKING

from loguru import logger

if TYPE_CHECKING:
    from app.services.match_manager import MatchRoom

BOT_ACCURACY = 0.90
BOT_MIN_INTERVAL = 4.0
BOT_BASE_INTERVAL = 12.0
BOT_ELO_SCALE = 0.008


def _calculate_bot_interval(opponent_elo: int) -> float:
    """Calculates the interval between bot answers."""
    interval = BOT_BASE_INTERVAL - (opponent_elo - 800) * BOT_ELO_SCALE
    return max(BOT_MIN_INTERVAL, interval)


async def run_bot(room: "MatchRoom", opponent_elo: int) -> None:
    """Runs the bot opponent as an asyncio task."""
    from app.services.match_manager import MatchState, submit_answer, _send

    interval = _calculate_bot_interval(opponent_elo)
    bot_player = room.player2

    logger.info(
        "Bot started for match {} (interval={:.1f}s, accuracy={:.0%})",
        room.match_id, interval, BOT_ACCURACY,
    )

    try:
        while room.state != MatchState.IN_PROGRESS:
            await asyncio.sleep(0.1)

        await asyncio.sleep(random.uniform(1.0, 3.0))

        while room.state == MatchState.IN_PROGRESS:
            q_index = bot_player.question_index

            if q_index >= len(room.questions):
                logger.info("Bot ran out of questions in match {}", room.match_id)
                break

            question = room.questions[q_index]

            if room.mode == 1:
                from app.engine.mode2_logic_engine import apply_gate
                correct_answer = None
                wire_values = question.circuit.get("wire_values", {})
                for gate in question.circuit["gates"]:
                    in1 = wire_values.get(gate["inputs"][0])
                    in2 = wire_values.get(gate["inputs"][1])
                    expected = apply_gate(gate["type"], in1, in2)
                    out_id = gate["id"].replace("G", "Out")
                    actual = wire_values.get(out_id)
                    if expected != actual:
                        correct_answer = gate["id"]
                        break
                
                if random.random() < BOT_ACCURACY:
                    bot_answer = correct_answer
                else:
                    gates = [g["id"] for g in question.circuit["gates"] if g["id"] != correct_answer]
                    bot_answer = random.choice(gates) if gates else correct_answer
            else:
                from app.engine.mode2_logic_engine import evaluate_circuit
                correct_answer = evaluate_circuit(question.circuit)
                
                if random.random() < BOT_ACCURACY:
                    bot_answer = correct_answer
                else:
                    if correct_answer:
                        idx = random.randint(0, len(correct_answer) - 1)
                        flipped = "1" if correct_answer[idx] == "0" else "0"
                        bot_answer = correct_answer[:idx] + flipped + correct_answer[idx + 1:]
                    else:
                        bot_answer = "0"

            result = await submit_answer(room, bot_player.user_id, bot_answer, q_index)

            if "error" in result:
                logger.warning(
                    "Bot answer error in match {}: {}",
                    room.match_id, result["error"],
                )
                break

            await _send(room.player1.user_id, {
                "type": "opponent_progress",
                "opponent_score": bot_player.score,
                "opponent_solved": bot_player.questions_solved,
            })

            jitter = interval * random.uniform(-0.2, 0.2)
            await asyncio.sleep(interval + jitter)

    except asyncio.CancelledError:
        logger.info("Bot cancelled for match {}", room.match_id)
    except Exception as e:
        logger.error("Bot error in match {}: {}", room.match_id, e)
