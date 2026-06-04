# core/perception/parser.py
# Public perception entrypoint for Memora.
# Executes embedding, entity extraction, and semantic classification
# concurrently and returns a unified PerceptionResult.

from __future__ import annotations

import asyncio
import logging
import time
from uuid import UUID

from backend.config import settings

from backend.models.memory import MemoryType
from backend.models.message import PerceptionResult

from backend.core.perception.embedder import (
    embed_text,
)

from backend.core.perception.entity_extractor import (
    EntityExtractorError,
    extract_entities,
)

from backend.core.perception.semantic_tagger import (
    SemanticTaggerError,
    classify_memory_type,
)


logger = logging.getLogger(__name__)


class PerceptionError(Exception):
    """Raised when perception cannot produce required outputs."""


async def parse(
    text: str,
    session_id: UUID,
    user_id: UUID,
) -> PerceptionResult:
    """
    Run all perception stages concurrently.

    Required:
        - embedding

    Optional:
        - entity extraction
        - semantic classification
    """

    start = time.perf_counter()

    embed_started = (
        time.perf_counter()
    )

    entity_started = (
        time.perf_counter()
    )

    classify_started = (
        time.perf_counter()
    )

    tasks = [
        embed_text(
            text
        ),

        extract_entities(
            text
        ),

        classify_memory_type(
            text
        ),
    ]

    (
        embedding_result,
        entities_result,
        classifier_result,
    ) = await asyncio.gather(
        *tasks,
        return_exceptions=True,
    )



    if isinstance(
        embedding_result,
        Exception,
    ):
        logger.exception(
            "Embedding failed",
            extra={
                "session_id":
                    str(session_id),
                "user_id":
                    str(user_id),
            },
        )

        raise PerceptionError(
            "Embedding required for perception"
        ) from embedding_result



    embedding_elapsed = (
        time.perf_counter()
        - embed_started
    )

    logger.debug(
        "Embedded",
        extra={
            "duration_ms":
                round(
                    embedding_elapsed
                    * 1000,
                    2,
                ),
        },
    )



    if isinstance(
        entities_result,
        Exception,
    ):

        if isinstance(
            entities_result,
            EntityExtractorError,
        ):
            logger.warning(
                "Entity extraction degraded",
                exc_info=(
                    entities_result
                ),
            )

        entities: list[
            dict
        ] = []

    else:

        entities = (
            entities_result
        )

        entity_elapsed = (
            time.perf_counter()
            - entity_started
        )

        logger.debug(
            "Extracted entities",
            extra={
                "count":
                    len(
                        entities
                    ),
                "duration_ms":
                    round(
                        entity_elapsed
                        * 1000,
                        2,
                    ),
            },
        )



    if isinstance(
        classifier_result,
        Exception,
    ):

        if isinstance(
            classifier_result,
            SemanticTaggerError,
        ):
            logger.warning(
                "Classification degraded",
                exc_info=(
                    classifier_result
                ),
            )

        memory_type = (
            MemoryType.EPISODIC
        )

        classification_scores = {
            t.value: (
                1.0
                if t
                is MemoryType.EPISODIC
                else 0.0
            )
            for t
            in MemoryType
        }

    else:

        (
            memory_type,
            classification_scores,
        ) = (
            classifier_result
        )

        classify_elapsed = (
            time.perf_counter()
            - classify_started
        )

        logger.debug(
            "Classified memory",
            extra={
                "memory_type":
                    memory_type.value,
                "confidence":
                    classification_scores.get(
                        memory_type.value,
                        0.0,
                    ),
                "duration_ms":
                    round(
                        classify_elapsed
                        * 1000,
                        2,
                    ),
            },
        )



    if (
        len(
            embedding_result
        )
        != settings.embedding_dims
    ):
        raise PerceptionError(
            "Invalid embedding dimension"
        )



    perception = (
        PerceptionResult(
            text=text,
            embedding=(
                embedding_result
            ),
            entities=(
                entities
            ),
            memory_type=(
                memory_type
            ),
            classification_scores=(
                classification_scores
            ),
            detected_language=None,
        )
    )

    total_ms = round(
        (
            time.perf_counter()
            - start
        )
        * 1000,
        2,
    )

    logger.info(
        "Perception complete",
        extra={
            "duration_ms":
                total_ms,
            "session_id":
                str(session_id),
            "user_id":
                str(user_id),
        },
    )

    return perception


__all__ = [
    "PerceptionError",
    "parse",
]