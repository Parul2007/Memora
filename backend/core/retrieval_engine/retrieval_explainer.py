"""
backend/core/retrieval_engine/retrieval_explainer.py

Generates human-readable explanations for retrieved memories.
"""

from __future__ import annotations

import logging

from backend.models.memory import MemorySearchResult


logger = logging.getLogger(__name__)


class RetrievalExplainerError(Exception):
    """Raised when retrieval explanation generation fails."""


def _reason_from_score(score: float) -> str:
    if score > 0.8:
        return "highly relevant"

    if score >= 0.6:
        return "relevant"

    return "contextually related"


async def explain(
    query: str,
    results: list[MemorySearchResult],
) -> list[MemorySearchResult]:
    """
    Attach retrieval explanations to results.

    Format:
    Retrieved as {memory_type} memory (relevance: {score:.0%}) — {reason}
    """

    try:
        if not results:
            return results

        for result in results:
            memory = result.memory

            score = float(
                getattr(result, "similarity_score", 0.0)
            )

            memory_type = str(
                getattr(memory, "memory_type", "unknown")
            )

            if "." in memory_type:
                memory_type = memory_type.split(".")[-1]

            explanation = (
                f"Retrieved as {memory_type.lower()} memory "
                f"(relevance: {score:.0%}) — "
                f"{_reason_from_score(score)}"
            )

            result.retrieval_explanation = explanation

        return results

    except Exception:
        logger.exception(
            "retrieval_explainer_failed",
            extra={
                "query_length": len(query),
                "result_count": len(results),
            },
        )

        return results