# core/long_term_memory/consolidation/contradiction_detector.py
# Detects logical contradictions across semantic memories.
# Routes contradiction analysis to Hugging Face Serverless Inference API with robust fallback.

from __future__ import annotations

import itertools
import logging
import httpx
from dataclasses import dataclass

from backend.config import settings
from backend.models.memory import Memory


logger = logging.getLogger(__name__)

CONTRADICTION_THRESHOLD = 0.7
MAX_PAIRS = 500
MAX_MEMORIES = 32
HF_URL = f"https://router.huggingface.co/hf-inference/models/{settings.nli_model_name}"


class ContradictionDetectorError(Exception):
    """Raised when contradiction detection fails."""


@dataclass(slots=True)
class ContradictionPair:
    memory_a: Memory
    memory_b: Memory

    contradiction_score: float
    neutral_score: float
    entailment_score: float

    verdict: str


def _ensure_model_loaded() -> None:
    pass


def _build_pairs(
    memories: list[Memory],
) -> list[tuple[Memory, Memory]]:

    pairs = [
        pair
        for pair
        in itertools.combinations(memories, 2)
        if pair[0].id != pair[1].id
    ]

    return pairs[:MAX_PAIRS]


def _label(
    contradiction: float,
    neutral: float,
    entailment: float,
) -> str:

    winner = max(
        (
            ("contradiction", contradiction),
            ("neutral", neutral),
            ("entailment", entailment),
        ),
        key=lambda x: x[1],
    )[0]

    return winner


async def detect_contradictions(
    memories: list[Memory],
    threshold: float = CONTRADICTION_THRESHOLD,
) -> list[ContradictionPair]:
    """
    Run batched contradiction detection across semantic memories.
    """
    if len(memories) < 2:
        return []

    if len(memories) > MAX_MEMORIES:
        logger.warning(
            "Skipping contradiction detection due to pair explosion",
            extra={"memory_count": len(memories)},
        )

        return []

    pairs = _build_pairs(memories)

    if not pairs:
        return []

    try:
        headers = {"Authorization": f"Bearer {settings.hf_api_token}"}
        payload = {
            "inputs": [
                {"text": a.content, "text_pair": b.content}
                for a, b in pairs
            ],
            "options": {"wait_for_model": True}
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(HF_URL, headers=headers, json=payload)
            
            if response.status_code == 200:
                predictions = response.json()
            else:
                logger.warning(
                    f"NLI HF API returned status {response.status_code}. Bypassing contradiction detection."
                )
                return []
                
    except Exception as exc:
        logger.warning(
            f"NLI HF API call failed: {exc}. Bypassing contradiction detection."
        )
        return []

    try:
        contradictions = []

        # HF typically returns list of dicts: [{"label": "CONTRADICTION", "score": 0.9}, ...] or 2D list of scores [[0.9, 0.05, 0.05], ...]
        # Let's map it robustly to [contradiction, neutral, entailment]
        for (memory_a, memory_b), raw_pred in zip(pairs, predictions, strict=False):
            contradiction, neutral, entailment = 0.0, 0.0, 0.0
            
            if isinstance(raw_pred, list):
                # If it's a list of floats e.g., [0.9, 0.05, 0.05]
                if len(raw_pred) >= 3:
                    contradiction = float(raw_pred[0])
                    neutral = float(raw_pred[1])
                    entailment = float(raw_pred[2])
                # If it's a list of dict e.g. [{"label": "contradiction", "score": 0.9}, ...]
                else:
                    for item in raw_pred:
                        if isinstance(item, dict):
                            label = str(item.get("label", "")).lower()
                            score = float(item.get("score", 0.0))
                            if "contradict" in label or "label_0" in label:
                                contradiction = score
                            elif "neutral" in label or "label_1" in label:
                                neutral = score
                            elif "entail" in label or "label_2" in label:
                                entailment = score
            elif isinstance(raw_pred, dict):
                # Single dict
                label = str(raw_pred.get("label", "")).lower()
                score = float(raw_pred.get("score", 0.0))
                if "contradict" in label:
                    contradiction = score
                elif "neutral" in label:
                    neutral = score
                elif "entail" in label:
                    entailment = score

            verdict = _label(contradiction, neutral, entailment)

            if contradiction < threshold:
                continue

            contradictions.append(
                ContradictionPair(
                    memory_a=memory_a,
                    memory_b=memory_b,
                    contradiction_score=contradiction,
                    neutral_score=neutral,
                    entailment_score=entailment,
                    verdict=verdict,
                )
            )

        logger.info(
            f"Checked {len(pairs)} pairs, found {len(contradictions)} contradictions"
        )

        return contradictions

    except Exception as exc:
        raise ContradictionDetectorError(
            f"Contradiction detection post-processing failed: {exc}"
        ) from exc


__all__ = [
    "CONTRADICTION_THRESHOLD",
    "ContradictionPair",
    "ContradictionDetectorError",
    "detect_contradictions",
]
