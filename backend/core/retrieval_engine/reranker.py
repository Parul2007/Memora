"""
backend/core/retrieval_engine/reranker.py

Cross-encoder reranking using bge-reranker-v2-m3.
"""

from __future__ import annotations

import logging
import httpx

from backend.config import settings
from backend.models.memory import (
    Memory,
    MemorySearchResult,
)


logger = logging.getLogger(__name__)
HF_URL = f"https://router.huggingface.co/hf-inference/models/{settings.reranker_model_name}"


class RerankerError(Exception):
    """Raised when reranking fails."""


async def rerank(
    query: str,
    memories: list[Memory],
    top_k: int = 8,
) -> list[MemorySearchResult]:
    """
    Rerank retrieved memories using cross-encoder relevance.
    """
    if not memories:
        return []

    try:
        headers = {"Authorization": f"Bearer {settings.hf_api_token}"}
        payload = {
            "inputs": [
                {"text": query, "text_pair": memory.content}
                for memory in memories
            ],
            "options": {"wait_for_model": True}
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(HF_URL, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                # Handle HF returns which are typically [{score: 0.9}, ...] or [{label: "LABEL_0", score: 0.9}]
                if isinstance(data, list) and len(data) == len(memories):
                    scores = []
                    for item in data:
                        if isinstance(item, dict):
                            scores.append(float(item.get("score", 0.0)))
                        elif isinstance(item, list) and len(item) > 0:
                            scores.append(float(item[0].get("score", 0.0)))
                        else:
                            scores.append(float(item))
                else:
                    # Fallback to scoring everything 1.0 down to 0.5 linearly if output format doesn't match
                    scores = [1.0 - (i * 0.05) for i in range(len(memories))]
            else:
                logger.warning(
                    f"Reranker HF API status {response.status_code}. Using linear fallback based on Qdrant scores."
                )
                scores = [1.0 - (i * 0.05) for i in range(len(memories))]
                
    except Exception as exc:
        logger.warning(
            f"Reranker HF API failed: {exc}. Using fallback linear scoring."
        )
        scores = [1.0 - (i * 0.05) for i in range(len(memories))]

    try:
        ranked = sorted(
            zip(memories, scores),
            key=lambda x: float(x[1]),
            reverse=True,
        )

        results: list[MemorySearchResult] = []

        for memory, score in ranked[:top_k]:
            rerank_score = float(score)

            results.append(
                MemorySearchResult(
                    memory=memory,
                    similarity_score=rerank_score,
                    rerank_score=rerank_score,
                )
            )

        best_score = (
            results[0].similarity_score
            if results
            else 0.0
        )

        logger.info(
            "Reranked %s candidates → top %s, best score=%.3f",
            len(memories),
            min(top_k, len(results)),
            best_score,
        )

        return results

    except Exception as exc:
        logger.exception(
            "reranking_failed",
            extra={
                "candidate_count": len(memories),
                "top_k": top_k,
            },
        )

        raise RerankerError(
            "Failed to rerank retrieval candidates."
        ) from exc