"""
backend/core/retrieval_engine/relevance_scorer.py

Computes final retrieval relevance scores using:
- rerank score
- importance score
- recency
- decay factor
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Final

from backend.models.memory import MemorySearchResult


logger = logging.getLogger(__name__)


RERANK_WEIGHT: Final[float] = 0.50
IMPORTANCE_WEIGHT: Final[float] = 0.20
RECENCY_WEIGHT: Final[float] = 0.20
DECAY_WEIGHT: Final[float] = 0.10

RECENCY_WINDOW_DAYS: Final[float] = 30.0


class RelevanceScorerError(Exception):
    """Raised when relevance scoring fails."""


def _recency_score(created_at: datetime) -> float:
    """
    Compute normalized recency score.

    Rules:
    - 1.0 => created today
    - linear decay over 30 days
    - lower bounded at 0.0
    """

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)

    days_since_created = max(
        0.0,
        (now - created_at).total_seconds() / 86400.0,
    )

    return max(
        0.0,
        1.0 - (days_since_created / RECENCY_WINDOW_DAYS),
    )


async def score_memories(
    results: list[MemorySearchResult],
) -> list[MemorySearchResult]:
    """
    Compute final composite relevance scores.

    Formula:
        final_score =
            0.50 * rerank_score +
            0.20 * importance_score +
            0.20 * recency_score +
            0.10 * decay_factor

    Updates:
        result.similarity_score

    Returns:
        Reordered results (descending)
    """

    try:
        if not results:
            return []

        for result in results:
            memory = result.memory

            rerank_score = float(
                getattr(result, "similarity_score", 0.0)
            )

            importance_score = float(
                getattr(memory, "importance_score", 0.0)
            )

            decay_factor = float(
                getattr(memory, "decay_factor", 1.0)
            )

            created_at = getattr(memory, "created_at", None)

            if created_at is None:
                recency = 0.0
            else:
                recency = _recency_score(created_at)

            final_score = (
                (RERANK_WEIGHT * rerank_score)
                + (IMPORTANCE_WEIGHT * importance_score)
                + (RECENCY_WEIGHT * recency)
                + (DECAY_WEIGHT * decay_factor)
            )

            result.similarity_score = round(final_score, 6)

        ranked = sorted(
            results,
            key=lambda item: item.similarity_score,
            reverse=True,
        )

        logger.debug(
            "relevance_scoring_complete",
            extra={
                "top_scores": [
                    round(r.similarity_score, 6)
                    for r in ranked[:3]
                ],
                "total_results": len(ranked),
            },
        )

        return ranked

    except Exception as exc:
        logger.exception(
            "relevance_scoring_failed",
            extra={
                "result_count": len(results),
            },
        )

        raise RelevanceScorerError(
            "Failed to compute relevance scores."
        ) from exc