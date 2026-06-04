# core/perception/entity_extractor.py
# Async entity extraction adapter for Memora.
# Routes entity extraction to Hugging Face Serverless Inference API with robust fallback.

from __future__ import annotations

import logging
import re
import httpx
from typing import Any

from backend.config import settings

logger = logging.getLogger(__name__)

MAX_ENTITIES = 50
HF_URL = f"https://router.huggingface.co/hf-inference/models/{settings.ner_model_name}"

DEFAULT_LABELS = [
    "person",
    "place",
    "organization",
    "date",
    "time",
    "event",
    "product",
    "concept",
    "emotion",
    "goal",
    "habit",
    "preference",
    "topic",
    "relationship",
]


class EntityExtractorError(Exception):
    """Raised when entity extraction fails."""


def _ensure_model_loaded() -> None:
    pass


def _fallback_extract(text: str, labels: list[str]) -> list[dict[str, Any]]:
    """Lightweight regex-based entity extractor fallback in case HF API is sleeping or rate-limited."""
    entities = []
    
    # Simple regex for Capitalized Words (for Person, Place, Organization)
    cap_words = re.finditer(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", text)
    for match in cap_words:
        ent_text = match.group()
        # Basic heuristic mapping
        label = "concept"
        lower_text = ent_text.lower()
        if any(p in lower_text for p in ["mr", "ms", "dr", "john", "parul", "sarah", "alex"]):
            label = "person"
        elif any(p in lower_text for p in ["city", "street", "paris", "london", "delhi", "york", "india", "home", "office"]):
            label = "place"
        elif any(p in lower_text for p in ["inc", "co", "corp", "google", "microsoft", "apple", "amazon"]):
            label = "organization"
            
        if label in labels:
            entities.append({
                "text": ent_text,
                "label": label,
                "score": 0.8,
                "start": match.start(),
                "end": match.end()
            })
            
    # Simple regex for dates
    dates = re.finditer(r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:, \d{4})?\b", text)
    for match in dates:
        if "date" in labels:
            entities.append({
                "text": match.group(),
                "label": "date",
                "score": 0.9,
                "start": match.start(),
                "end": match.end()
            })
            
    return entities


def _normalize_entity(
    entity: dict[str, Any],
) -> dict[str, Any]:

    score = float(
        entity.get(
            "score",
            entity.get(
                "confidence",
                0.0,
            ),
        )
    )

    score = max(0.0, min(1.0, score))

    return {
        "text": str(entity.get("text", "")),
        "label": str(entity.get("label", entity.get("entity", "unknown"))).lower(),
        "score": score,
        "start": int(entity.get("start", 0)),
        "end": int(entity.get("end", 0)),
    }


def _deduplicate(
    entities: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    deduped: dict[tuple[str, str, int, int], dict[str, Any]] = {}

    for entity in entities:
        key = (
            entity["text"],
            entity["label"],
            entity["start"],
            entity["end"],
        )

        existing = deduped.get(key)

        if existing is None or entity["score"] > existing["score"]:
            deduped[key] = entity

    ordered = sorted(
        deduped.values(),
        key=lambda x: (x["start"], -x["score"]),
    )

    return ordered[:MAX_ENTITIES]


async def extract_entities(
    text: str,
    labels: list[str] = DEFAULT_LABELS,
    threshold: float = 0.3,
) -> list[dict[str, Any]]:
    """
    Extract typed entities using Hugging Face GLiNER API or fallback logic.
    """
    if not text.strip():
        return []

    try:
        headers = {"Authorization": f"Bearer {settings.hf_api_token}"}
        payload = {
            "inputs": text,
            "parameters": {"labels": labels, "threshold": threshold},
            "options": {"wait_for_model": True}
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(HF_URL, headers=headers, json=payload)
            
            # If Hugging Face is overloaded, rate-limited or sleeping, use the fallback parser
            if response.status_code != 200:
                logger.warning(
                    f"HF GLiNER API returned status {response.status_code}. Using fallback extractor."
                )
                raw_entities = _fallback_extract(text, labels)
            else:
                raw_entities = response.json()
                # If GLiNER API format is different or fails to yield list
                if not isinstance(raw_entities, list):
                    raw_entities = _fallback_extract(text, labels)
                    
    except Exception as exc:
        logger.warning(
            f"HF GLiNER API call failed: {exc}. Falling back to standard regex extractor."
        )
        raw_entities = _fallback_extract(text, labels)

    try:
        normalized = [_normalize_entity(entity) for entity in (raw_entities or [])]
        deduplicated = _deduplicate(normalized)

        logger.debug(
            "Entity extraction complete",
            extra={"entities_found": len(deduplicated)},
        )

        return deduplicated

    except Exception as exc:
        raise EntityExtractorError(
            f"Entity extraction post-processing failed: {exc}"
        ) from exc


__all__ = [
    "DEFAULT_LABELS",
    "EntityExtractorError",
    "extract_entities",
]