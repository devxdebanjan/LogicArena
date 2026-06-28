"""Elo rating calculation engine."""

from __future__ import annotations

import random

DEFAULT_ELO = 1000
K_NEW_PLAYER = 40
K_ESTABLISHED = 32
K_HIGH_ELO = 24
NEW_PLAYER_THRESHOLD = 20
HIGH_ELO_THRESHOLD = 1500

BOT_ELO_MIN = 400
BOT_ELO_MAX = 2000
BOT_ELO_JITTER = 150


def get_k_factor(games_played: int, current_elo: int) -> int:
    """Determines the K-factor based on player experience and rating."""
    if games_played < NEW_PLAYER_THRESHOLD:
        return K_NEW_PLAYER
    if current_elo > HIGH_ELO_THRESHOLD:
        return K_HIGH_ELO
    return K_ESTABLISHED


def _expected_score(player_elo: int, opponent_elo: int) -> float:
    """Calculates the expected score (probability of winning)."""
    return 1.0 / (1.0 + 10 ** ((opponent_elo - player_elo) / 400))


def calculate_elo_change(
    winner_elo: int,
    loser_elo: int,
    winner_k: int = K_ESTABLISHED,
    loser_k: int = K_ESTABLISHED,
) -> tuple[int, int]:
    """Calculates new Elo ratings after a decisive match (win/loss)."""
    expected_winner = _expected_score(winner_elo, loser_elo)
    expected_loser = _expected_score(loser_elo, winner_elo)

    new_winner = round(winner_elo + winner_k * (1.0 - expected_winner))
    new_loser = round(loser_elo + loser_k * (0.0 - expected_loser))

    new_loser = max(0, new_loser)

    return new_winner, new_loser


def calculate_draw_elo(
    p1_elo: int,
    p2_elo: int,
    p1_k: int = K_ESTABLISHED,
    p2_k: int = K_ESTABLISHED,
) -> tuple[int, int]:
    """Calculates new Elo ratings after a draw."""
    expected_p1 = _expected_score(p1_elo, p2_elo)
    expected_p2 = _expected_score(p2_elo, p1_elo)

    new_p1 = round(p1_elo + p1_k * (0.5 - expected_p1))
    new_p2 = round(p2_elo + p2_k * (0.5 - expected_p2))

    new_p1 = max(0, new_p1)
    new_p2 = max(0, new_p2)

    return new_p1, new_p2


def generate_bot_elo(opponent_elo: int) -> int:
    """Generates a random bot Elo around the opponent's rating."""
    jitter = random.randint(-BOT_ELO_JITTER, BOT_ELO_JITTER)
    bot_elo = opponent_elo + jitter
    return max(BOT_ELO_MIN, min(BOT_ELO_MAX, bot_elo))
