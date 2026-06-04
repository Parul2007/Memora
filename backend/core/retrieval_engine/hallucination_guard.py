"""
backend/core/retrieval_engine/hallucination_guard.py

Filters retrieved memories using NLI contradiction detection
to prevent grounding on conflicting context.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Final

from backend.registry import model_registry
from backend.models.memory import MemorySearchResult


logger = logging.getLogger(__name__)

CONTRADICTION_FILTER_THRESHOLD: Final[float] = 0.6


class HallucinationGuardError(Exception):
    """Raised when contradiction filtering fails."""


def _extract_contradiction_score(prediction: object) -> float:
    """
    Extract contradiction score from model output.

    Supports:
    - float
    - dict outputs
    - objects with contradiction_score
    """

    if isinstance(prediction, (float, int)):
        return float(prediction)

    if isinstance(prediction, dict):
        if "contradiction" in prediction:
            return float(prediction["contradiction"])

        if "contradiction_score" in prediction:
            return float(prediction["contradiction_score"])

        if "scores" in prediction and isinstance(prediction["scores"], dict):
            return float(prediction["scores"].get("contradiction", 0.0))

    score = getattr(prediction, "contradiction_score", None)

    if score is not None:
        return float(score)

    return 0.0


async def filter_contradictions(
    query: str,
    results: list[MemorySearchResult],
) -> list[MemorySearchResult]:
    """
    Remove retrieved memories that contradict the query.

    Never returns empty if original input was non-empty.
    """

    try:
        if not results:
            return []

        pairs = [
            [query, result.memory.content]
            for result in results
        ]

        loop = asyncio.get_running_loop()

        predictions = await loop.run_in_executor(
            None,
            model_registry.nli_model.predict,
            pairs,
        )

        filtered: list[MemorySearchResult] = []
        removed = 0

        for result, prediction in zip(results, predictions):
            contradiction_score = _extract_contradiction_score(
                prediction
            )

            if contradiction_score >= CONTRADICTION_FILTER_THRESHOLD:
                removed += 1
                continue

            filtered.append(result)

        logger.info(
            "Hallucination guard: removed %s contradicting memories from %s",
            removed,
            len(results),
        )

        if not filtered and results:
            logger.warning(
                "Hallucination guard removed all memories; returning original set"
            )
            return results

        return filtered

    except Exception as exc:
        logger.exception(
            "hallucination_guard_failed",
            extra={
                "query_length": len(query),
                "result_count": len(results),
            },
        )

        raise HallucinationGuardError(
            "Failed to filter contradictory memories."
        ) from exc