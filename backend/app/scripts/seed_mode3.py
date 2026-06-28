import asyncio
import logging
from app.config.database import async_session_factory
from app.engine.mode3_logic_engine import generate_puzzle
from app.models.mode3_puzzle import Mode3Puzzle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_puzzles(count_per_difficulty=20):
    difficulties = ["EASY", "MEDIUM", "HARD"]
    
    async with async_session_factory() as db:
        for difficulty in difficulties:
            logger.info(f"Generating {count_per_difficulty} puzzles for difficulty {difficulty}...")
            for _ in range(count_per_difficulty):
                try:
                    gen_result = generate_puzzle(difficulty=difficulty)
                    meta = gen_result["metadata"]
                    puzzle = Mode3Puzzle(
                        difficulty=difficulty,
                        grid_width=meta["grid_width"],
                        grid_height=meta["grid_height"],
                        num_gates=meta["num_gates"],
                        num_holes=meta["num_holes"],
                        bit_width=meta["bit_width"],
                        puzzle_data=gen_result["puzzle_data"]
                    )
                    db.add(puzzle)
                except Exception as e:
                    logger.error(f"Failed to generate puzzle: {e}")
                    
        await db.commit()
        logger.info("Successfully seeded mode 3 puzzles.")

if __name__ == "__main__":
    asyncio.run(seed_puzzles())
