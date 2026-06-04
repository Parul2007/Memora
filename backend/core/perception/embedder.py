# core/perception/embedder.py
# Async embedding adapter for Memora.
# Routes embedding generation to Hugging Face Serverless Inference API.

from __future__ import annotations

import logging
import time
import httpx

from backend.config import settings


logger = logging.getLogger(__name__)

MAX_TEXT_LENGTH = 8192
HF_URL = f"https://router.huggingface.co/hf-inference/models/{settings.embedding_model_name}"


class EmbedderError(Exception):
    """Raised when embedding generation fails."""


def _ensure_model_loaded() -> None:
    pass


def _prepare_text(
    text: str,
) -> str:

    if not text:
        raise ValueError(
            "Input text cannot be empty"
        )

    if len(text) > MAX_TEXT_LENGTH:
        logger.warning(
            "Embedding input truncated",
            extra={
                "original_length": len(text),
                "max_length": MAX_TEXT_LENGTH,
            },
        )

        return text[:MAX_TEXT_LENGTH]

    return text


def _validate_embedding(
    embedding: list[float],
) -> list[float]:

    if len(embedding) != settings.embedding_dims:
        raise EmbedderError(
            f"Expected embedding dimension "
            f"{settings.embedding_dims}, "
            f"received {len(embedding)}"
        )

    return embedding


def _validate_batch(
    embeddings: list[list[float]],
) -> list[list[float]]:

    for idx, vector in enumerate(
        embeddings
    ):
        if len(vector) != settings.embedding_dims:
            raise EmbedderError(
                f"Invalid embedding at index "
                f"{idx}: expected "
                f"{settings.embedding_dims}, got "
                f"{len(vector)}"
            )

    return embeddings


async def _query_hf(payload: dict) -> any:
    headers = {"Authorization": f"Bearer {settings.hf_api_token}"}
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(HF_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


async def embed_text(
    text: str,
) -> list[float]:
    """
    Generate embedding for a single text.
    Returns normalized embedding vector.
    """
    prepared = _prepare_text(text)

    try:
        payload = {"inputs": prepared, "options": {"wait_for_model": True}}
        result = await _query_hf(payload)
        
        # If the result is returned as a 2D list containing a single embedding
        if isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
            embedding = result[0]
        else:
            embedding = result

        return _validate_embedding(embedding)

    except Exception as exc:
        raise EmbedderError(
            f"Embedding failed: {exc}"
        ) from exc


async def embed_batch(
    texts: list[str],
    batch_size: int = 32,
) -> list[list[float]]:
    """
    Generate embeddings for text batches.
    Returns normalized embeddings.
    """
    prepared = [_prepare_text(text) for text in texts]
    start = time.perf_counter()

    try:
        payload = {"inputs": prepared, "options": {"wait_for_model": True}}
        embeddings = await _query_hf(payload)
        
        embeddings = _validate_batch(embeddings)

        if len(texts) > 10:
            elapsed = time.perf_counter() - start
            logger.info(
                "Batch embedding complete",
                extra={
                    "batch_size": len(texts),
                    "seconds": round(elapsed, 2),
                },
            )

        return embeddings

    except Exception as exc:
        raise EmbedderError(
            f"Batch embedding failed: {exc}"
        ) from exc


__all__ = [
    "EmbedderError",
    "embed_text",
    "embed_batch",
]