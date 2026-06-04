# core/long_term_memory/lifecycle/compression_engine.py
# Compresses highly similar memory clusters into representative memories.
# Uses the shared BART summarizer and reinserts compressed memories
# through the ingestion gateway.

from __future__ import annotations

import asyncio
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import text

from backend.registry import model_registry

from backend.db.postgres import (
    get_async_session,
)

from backend.models.memory import (
    Memory,
    MemoryCreate,
)

from backend.core.long_term_memory.ingestion.gateway import (
    MemoryIngestionGateway,
)


logger = logging.getLogger(__name__)

MAX_INPUT_CHARS = 3000


EXPIRE_MEMORIES = text(
    """
    UPDATE memories
    SET
        expires_at = NOW(),
        updated_at = NOW()
    WHERE
        id = ANY(
            :memory_ids
        )
    """
)


class CompressionError(Exception):
    """Raised for memory compression failures."""


class CompressionEngine:

    async def compress_cluster(
        self,
        memories: list[
            Memory
        ],
        user_id: UUID,
    ) -> Optional[
        Memory
    ]:
        """
        Compress similar memories
        into one representative.
        """

        try:

            if (
                len(memories)
                < 2
            ):
                return None

            if (
                model_registry
                .summarizer
                is None
            ):
                raise CompressionError(
                    "Summarizer unavailable"
                )

            combined = "\n".join(
                m.content
                for m
                in memories
            )

            combined = combined[
                :MAX_INPUT_CHARS
            ]

            loop = (
                asyncio
                .get_running_loop()
            )

            summary = (
                await loop
                .run_in_executor(
                    None,
                    lambda:
                    model_registry
                    .summarizer(
                        combined,
                        max_length=180,
                        min_length=40,
                        do_sample=False,
                    ),
                )
            )

            compressed = (
                summary[0]
                [
                    "summary_text"
                ]
                .strip()
            )

            representative = max(
                memories,
                key=lambda m:
                m.importance_score,
            )

            entities = sorted(
                {
                    entity
                    for memory
                    in memories
                    for entity
                    in memory.entities
                }
            )

            candidate = (
                MemoryCreate(
                    user_id=user_id,

                    content=(
                        compressed
                    ),

                    memory_type=(
                        representative
                        .memory_type
                    ),

                    embedding=(
                        representative
                        .embedding
                    ),

                    importance_score=(
                        representative
                        .importance_score
                    ),

                    emotional_weight=(
                        representative
                        .emotional_weight
                    ),

                    entities=(
                        entities
                    ),

                    metadata={
                        "compressed":
                            True,
                        "source_ids": [
                            str(
                                m.id
                            )
                            for m
                            in memories
                        ],
                    },
                )
            )

            gateway = (
                MemoryIngestionGateway()
            )

            created = (
                await gateway
                .ingest(
                    candidate
                )
            )

            if created is None:
                return None

            async with (
                get_async_session()
                as session
            ):

                await session.execute(
                    EXPIRE_MEMORIES,
                    {
                        "memory_ids":
                        [
                            str(
                                m.id
                            )
                            for m
                            in memories
                        ]
                    },
                )

                await session.commit()

            logger.info(
                (
                    "Compressed cluster "
                    f"of "
                    f"{len(memories)} "
                    "memories into 1"
                )
            )

            return created

        except Exception as exc:

            raise (
                CompressionError(
                    (
                        "Compression failed: "
                        f"{exc}"
                    )
                )
            ) from exc



    async def find_compression_candidates(
        self,
        memories: list[
            Memory
        ],
        similarity_threshold: float = 0.90,
    ) -> list[
        list[Memory]
    ]:
        """
        Greedy cluster formation.
        """

        try:

            if not memories:
                return []

            assigned: set[
                UUID
            ] = set()

            clusters: list[
                list[Memory]
            ] = []

            def similarity(
                a: list[float],
                b: list[float],
            ) -> float:

                dot = sum(
                    x * y
                    for x, y
                    in zip(
                        a,
                        b,
                        strict=False,
                    )
                )

                norm_a = (
                    sum(
                        x * x
                        for x in a
                    )
                    ** 0.5
                )

                norm_b = (
                    sum(
                        y * y
                        for y in b
                    )
                    ** 0.5
                )

                if (
                    norm_a
                    == 0
                    or norm_b
                    == 0
                ):
                    return 0.0

                return (
                    dot
                    /
                    (
                        norm_a
                        *
                        norm_b
                    )
                )

            for memory in memories:

                if (
                    memory.id
                    in assigned
                ):
                    continue

                cluster = [
                    memory
                ]

                assigned.add(
                    memory.id
                )

                for other in memories:

                    if (
                        other.id
                        in assigned
                    ):
                        continue

                    score = similarity(
                        memory.embedding,
                        other.embedding,
                    )

                    if (
                        score
                        >=
                        similarity_threshold
                    ):

                        cluster.append(
                            other
                        )

                        assigned.add(
                            other.id
                        )

                if (
                    len(cluster)
                    > 1
                ):
                    clusters.append(
                        cluster
                    )

            return clusters

        except Exception as exc:

            raise (
                CompressionError(
                    (
                        "Candidate discovery "
                        f"failed: {exc}"
                    )
                )
            ) from exc


__all__ = [
    "CompressionEngine",
    "CompressionError",
]