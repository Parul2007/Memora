# core/long_term_memory/ingestion/deduplicator.py
# Vector similarity deduplication for Memora.
# Prevents redundant long-term storage by comparing incoming memory
# embeddings against existing memories using pgvector cosine distance.

from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import text

from backend.config import settings
from backend.db.postgres import get_async_session

from backend.models.memory import (
    MemoryCreate,
)


logger = logging.getLogger(__name__)


class DeduplicatorError(Exception):
    """Raised when memory deduplication fails."""


DEDUP_QUERY = text(
    """
    SELECT
        id,
        1 - (
            embedding <=> :query_embedding::vector
        ) AS similarity
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = :memory_type
    ORDER BY
        embedding <=> :query_embedding::vector
    LIMIT 1
    """
)


SIMILAR_QUERY = text(
    """
    SELECT
        id,
        1 - (
            embedding <=> :query_embedding::vector
        ) AS similarity
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = :memory_type
        AND (
            1 - (
                embedding <=> :query_embedding::vector
            )
        ) >= :threshold
    ORDER BY
        embedding <=> :query_embedding::vector
    LIMIT :top_k
    """
)


def _validate_embedding(
    embedding: list[float],
) -> None:

    if (
        len(embedding)
        != settings.embedding_dims
    ):
        raise DeduplicatorError(
            (
                "Expected embedding "
                f"dimension "
                f"{settings.embedding_dims}"
            )
        )


async def check_duplicate(
    memory_create: MemoryCreate,
    user_id: UUID,
    threshold: float = 0.92,
) -> tuple[
    bool,
    Optional[UUID],
]:
    """
    Determine whether an incoming
    memory already exists.
    """

    try:

        _validate_embedding(
            memory_create.embedding
        )

        params = {
            "query_embedding":
                memory_create.embedding,
            "user_id":
                user_id,
            "memory_type":
                memory_create.memory_type.value,
        }

        async with (
            get_async_session()
            as session
        ):

            result = (
                await session.execute(
                    DEDUP_QUERY,
                    params,
                )
            )

            row = (
                result.first()
            )

        if row is None:
            return (
                False,
                None,
            )

        memory_id = (
            UUID(
                str(
                    row.id
                )
            )
        )

        similarity = float(
            row.similarity
        )

        logger.info(
            (
                "Dedup check: "
                f"similarity="
                f"{similarity:.3f} "
                f"for user "
                f"{user_id}"
            )
        )

        if (
            similarity
            >= threshold
        ):
            return (
                True,
                memory_id,
            )

        return (
            False,
            None,
        )

    except Exception as exc:
        raise (
            DeduplicatorError(
                (
                    "Duplicate check "
                    f"failed: {exc}"
                )
            )
        ) from exc


async def find_similar(
    memory_create: MemoryCreate,
    user_id: UUID,
    top_k: int = 3,
    threshold: float = 0.85,
) -> list[
    tuple[
        UUID,
        float,
    ]
]:
    """
    Find related memories for
    consolidation and soft dedup.
    """

    try:

        _validate_embedding(
            memory_create.embedding
        )

        params = {
            "query_embedding":
                memory_create.embedding,
            "user_id":
                user_id,
            "memory_type":
                memory_create.memory_type.value,
            "threshold":
                threshold,
            "top_k":
                top_k,
        }

        async with (
            get_async_session()
            as session
        ):

            result = (
                await session.execute(
                    SIMILAR_QUERY,
                    params,
                )
            )

            rows = (
                result.fetchall()
            )

        similar = []

        for row in rows:

            similarity = float(
                row.similarity
            )

            logger.info(
                (
                    "Dedup check: "
                    f"similarity="
                    f"{similarity:.3f} "
                    f"for user "
                    f"{user_id}"
                )
            )

            similar.append(
                (
                    UUID(
                        str(
                            row.id
                        )
                    ),
                    similarity,
                )
            )

        return similar

    except Exception as exc:
        raise (
            DeduplicatorError(
                (
                    "Similarity search "
                    f"failed: {exc}"
                )
            )
        ) from exc


__all__ = [
    "DeduplicatorError",
    "check_duplicate",
    "find_similar",
]