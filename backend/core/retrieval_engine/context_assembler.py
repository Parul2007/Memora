"""
backend/core/retrieval_engine/context_assembler.py

Final retrieval pipeline stage:
relevance scoring -> contradiction filtering -> context limiting
"""

from __future__ import annotations

import logging
from importlib import import_module

from backend.config import settings
from backend.models.memory import MemorySearchResult
from backend.core.retrieval_engine.hallucination_guard import (
    filter_contradictions,
)
from backend.core.retrieval_engine.relevance_scorer import (
    score_memories,
)


logger = logging.getLogger(__name__)


class ContextAssemblerError(Exception):
    """Raised when context assembly fails."""


class ContextAssembler:
    """
    Produces final memory context for response generation.
    """

    async def assemble(
        self,
        query: str,
        reranked_results: list[MemorySearchResult],
    ) -> list[MemorySearchResult]:
        """
        Assemble final retrieval context.

        Pipeline:
        1. Composite relevance scoring
        2. Hallucination filtering
        3. Context capping
        4. Retrieval explanation (best effort)
        """

        try:
            if not reranked_results:
                return []

            scored_results = await score_memories(
                reranked_results
            )

            filtered_results = await filter_contradictions(
                query=query,
                results=scored_results,
            )

            final_results = filtered_results[
                :settings.max_context_memories
            ]

            try:
                retrieval_explainer = import_module(
                    "backend.core.retrieval_engine.retrieval_explainer"
                )

                explain = getattr(
                    retrieval_explainer,
                    "explain",
                    None,
                )

                if callable(explain):
                    maybe_result = explain(final_results)

                    if hasattr(maybe_result, "__await__"):
                        await maybe_result

            except Exception:
                logger.debug(
                    "retrieval_explainer_unavailable",
                    exc_info=True,
                )

            logger.info(
                "Context assembled: %s memories selected for response generation",
                len(final_results),
            )

            return final_results

        except Exception as exc:
            logger.exception(
                "context_assembly_failed",
                extra={
                    "query_length": len(query),
                    "input_count": len(reranked_results),
                },
            )

            raise ContextAssemblerError(
                "Failed to assemble retrieval context."
            ) from exc