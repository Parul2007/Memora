# core/perception/semantic_tagger.py
# Async semantic classification adapter for Memora.
# Routes classification to Hugging Face Serverless Inference API.

from __future__ import annotations

import logging
import httpx
from typing import Final

from backend.config import settings
from backend.models.memory import MemoryType


logger = logging.getLogger(__name__)

MAX_TEXT_LENGTH: Final[int] = 1024
LOW_CONFIDENCE_THRESHOLD: Final[float] = 0.30
HF_URL = f"https://router.huggingface.co/hf-inference/models/{settings.classification_model_name}"


class SemanticTaggerError(Exception):
    """Raised when semantic classification fails."""


CANDIDATE_LABELS: dict[
    MemoryType,
    str,
] = {
    MemoryType.EPISODIC:
        (
            "this is a personal event, "
            "experience, or memory that "
            "happened at a specific time"
        ),

    MemoryType.SEMANTIC:
        (
            "this is a general fact, "
            "belief, knowledge, or "
            "preference that is "
            "always true"
        ),

    MemoryType.PROCEDURAL:
        (
            "this is a habit, routine, "
            "pattern, skill, or way "
            "of doing things"
        ),

    MemoryType.EMOTIONAL:
        (
            "this is an emotional state, "
            "feeling, mood, or reaction"
        ),
}


HYPOTHESES = list(
    CANDIDATE_LABELS.values()
)

LABEL_TO_MEMORY_TYPE = {
    v: k
    for k, v in (
        CANDIDATE_LABELS.items()
    )
}


def _ensure_model_loaded() -> None:
    pass


def _truncate(
    text: str,
) -> str:

    if not text.strip():
        return ""

    if len(text) > MAX_TEXT_LENGTH:
        logger.warning(
            "Classifier input truncated",
            extra={
                "original_length": len(text),
                "max_length": MAX_TEXT_LENGTH,
            },
        )

        return text[
            :MAX_TEXT_LENGTH
        ]

    return text


def _normalize_scores(
    labels: list[str],
    scores: list[float],
) -> dict[
    str,
    float,
]:

    normalized = {
        memory_type.value: 0.0
        for memory_type
        in MemoryType
    }

    total = sum(
        float(score)
        for score
        in scores
    )

    for label, score in zip(
        labels,
        scores,
        strict=False,
    ):
        memory_type = (
            LABEL_TO_MEMORY_TYPE
            .get(label)
        )

        if memory_type:
            normalized[
                memory_type.value
            ] = (
                float(score)
                / total
                if total > 0
                else 0.0
            )

    return normalized


async def classify_memory_type(
    text: str,
) -> tuple[
    MemoryType,
    dict[str, float],
]:
    """
    Classify text into canonical memory categories.
    """
    prepared = _truncate(text)

    if not prepared:
        return (
            MemoryType.EPISODIC,
            {
                t.value: (
                    1.0
                    if t
                    is MemoryType.EPISODIC
                    else 0.0
                )
                for t
                in MemoryType
            },
        )

    try:
        headers = {"Authorization": f"Bearer {settings.hf_api_token}"}
        payload = {
            "inputs": prepared,
            "parameters": {"candidate_labels": HYPOTHESES},
            "options": {"wait_for_model": True}
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(HF_URL, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

        if isinstance(result, list) and len(result) > 0:
            result = result[0]

        labels = result.get("labels", [])
        scores = result.get("scores", [])

        score_map = _normalize_scores(labels, scores)
        highest = max(score_map.values(), default=0.0)

        if highest < LOW_CONFIDENCE_THRESHOLD:
            logger.warning(
                "Low confidence classification, defaulting",
                extra={"max_score": highest},
            )

            return (
                MemoryType.EPISODIC,
                score_map,
            )

        winner = max(score_map.items(), key=lambda x: x[1])[0]
        memory_type = MemoryType(winner)

        logger.debug(
            "Semantic classification complete",
            extra={
                "memory_type": memory_type.value,
                "confidence": score_map[memory_type.value],
            },
        )

        return (
            memory_type,
            score_map,
        )

    except Exception as exc:
        raise SemanticTaggerError(
            f"Classification failed: {exc}"
        ) from exc


__all__ = [
    "CANDIDATE_LABELS",
    "SemanticTaggerError",
    "classify_memory_type",
]
