# core/long_term_memory/scoring/importance_engine.py
# Computes deterministic memory importance scores for Memora.
# Scores determine whether a memory should enter long-term storage
# and influence later decay and retrieval prioritization.

from __future__ import annotations

import logging

from backend.config import settings

from backend.models.memory import (
    MemoryType,
)

from backend.models.message import (
    PerceptionResult,
)


logger = logging.getLogger(__name__)


TYPE_WEIGHTS: dict[
    MemoryType,
    float,
] = {
    MemoryType.SEMANTIC: 0.70,
    MemoryType.PROCEDURAL: 0.65,
    MemoryType.EMOTIONAL: 0.60,
    MemoryType.EPISODIC: 0.50,
}


class ImportanceScoringError(Exception):
    """Raised when importance computation fails."""


def _clip(
    value: float,
    minimum: float = 0.0,
    maximum: float = 1.0,
) -> float:
    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


async def compute_importance(
    perception_result: PerceptionResult,
    emotional_weight: float = 0.0,
) -> float:
    """
    Compute deterministic importance score.

    Formula:

        base_score
        + entity_boost
        + emotional_boost
        + length_score
    """

    try:

        content = (
            perception_result
            .text
            .strip()
        )

        memory_type = (
            perception_result
            .memory_type
        )

        entities = (
            perception_result
            .entities
        )

        base_score = (
            TYPE_WEIGHTS
            .get(
                memory_type,
                TYPE_WEIGHTS[
                    MemoryType.EPISODIC
                ],
            )
        )

        entity_boost = min(
            len(
                entities
            )
            * 0.05,
            0.20,
        )

        emotional_boost = (
            abs(
                emotional_weight
            )
            * 0.15
        )

        length_score = (
            min(
                len(
                    content
                )
                / 500,
                1.0,
            )
            * 0.10
        )

        score = _clip(
            (
                base_score
                +
                entity_boost
                +
                emotional_boost
                +
                length_score
            )
        )

        logger.debug(
            (
                "Importance score "
                "computed"
            ),
            extra={
                "memory_type":
                    memory_type.value,
                "base":
                    round(
                        base_score,
                        4,
                    ),
                "entity_boost":
                    round(
                        entity_boost,
                        4,
                    ),
                "emotional_boost":
                    round(
                        emotional_boost,
                        4,
                    ),
                "length_score":
                    round(
                        length_score,
                        4,
                    ),
                "final":
                    round(
                        score,
                        4,
                    ),
            },
        )

        return score

    except Exception as exc:
        raise (
            ImportanceScoringError(
                (
                    "Failed to compute "
                    "importance score: "
                    f"{exc}"
                )
            )
        ) from exc


async def should_store(
    score: float,
) -> bool:
    """
    Determine whether memory
    should enter long-term storage.
    """

    if not (
        0.0
        <= score
        <= 1.0
    ):
        raise (
            ImportanceScoringError(
                (
                    "Score must be "
                    "between 0.0 "
                    "and 1.0"
                )
            )
        )

    return (
        score
        >=
        settings.importance_threshold
    )


__all__ = [
    "TYPE_WEIGHTS",
    "ImportanceScoringError",
    "compute_importance",
    "should_store",
]