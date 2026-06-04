# core/long_term_memory/ingestion/gateway.py
# THE ONLY ENTRY POINT FOR ALL MEMORY WRITES.
# Every memory persistence operation MUST pass through this gateway.
# Responsibilities:
#   importance scoring
#   duplicate prevention
#   store routing
#   vector indexing
#   entity graph synchronization

from __future__ import annotations

import asyncio
import logging
from typing import Any

from backend.config import settings

from backend.models.memory import (
    Memory,
    MemoryCreate,
    MemoryType,
)

from backend.models.message import (
    PerceptionResult,
)

from backend.core.long_term_memory.ingestion.deduplicator import (
    check_duplicate,
)

from backend.core.long_term_memory.scoring.importance_engine import (
    compute_importance,
    should_store,
)


logger = logging.getLogger(__name__)


class IngestionGatewayError(Exception):
    """Raised when ingestion fails."""


class IngestionDiscardedError(Exception):
    """Informational discard event."""


def _safe_import(
    module: str,
    attr: str,
) -> Any:
    try:

        imported = __import__(
            module,
            fromlist=[attr],
        )

        return getattr(
            imported,
            attr,
        )

    except Exception:
        return None


episodic_store = _safe_import(
    "backend.core.long_term_memory.stores.episodic",
    "episodic_store",
)

semantic_store = _safe_import(
    "backend.core.long_term_memory.stores.semantic",
    "semantic_store",
)

procedural_store = _safe_import(
    "backend.core.long_term_memory.stores.procedural",
    "procedural_store",
)

emotional_store = _safe_import(
    "backend.core.long_term_memory.stores.emotional",
    "emotional_store",
)

qdrant_indexer = _safe_import(
    "backend.core.long_term_memory.indexing.qdrant",
    "upsert_memory",
)

entity_graph_updater = _safe_import(
    "backend.core.long_term_memory.graph.entities",
    "update_memory_graph",
)


STORE_MAP = {
    MemoryType.EPISODIC:
        episodic_store,

    MemoryType.SEMANTIC:
        semantic_store,

    MemoryType.PROCEDURAL:
        procedural_store,

    MemoryType.EMOTIONAL:
        emotional_store,
}


async def _background_qdrant(
    memory: Memory,
) -> None:

    if (
        qdrant_indexer
        is None
    ):
        return

    try:

        await qdrant_indexer(
            memory
        )

    except Exception:
        logger.exception(
            "Qdrant indexing failed"
        )


async def _background_graph(
    memory: Memory,
) -> None:

    if (
        entity_graph_updater
        is None
    ):
        return

    try:

        await entity_graph_updater(
            memory
        )

    except Exception:
        logger.exception(
            "Entity graph update failed"
        )


class MemoryIngestionGateway:
    """
    Sole ingestion boundary.

    No memory write should bypass
    this gateway.
    """

    async def ingest(
        self,
        memory_create: MemoryCreate,
    ) -> Memory | None:

        try:

            perception = (
                PerceptionResult(
                    text=(
                        memory_create
                        .content
                    ),

                    embedding=(
                        memory_create
                        .embedding
                    ),

                    entities=[
                        {
                            "text":
                            entity
                        }
                        for entity
                        in (
                            memory_create
                            .entities
                        )
                    ],

                    memory_type=(
                        memory_create
                        .memory_type
                    ),

                    classification_scores={},
                )
            )

            score = (
                await compute_importance(
                    perception,
                    emotional_weight=(
                        memory_create
                        .emotional_weight
                    ),
                )
            )

            store_allowed = (
                await should_store(
                    score
                )
            )

            logger.info(
                (
                    "Ingesting memory: "
                    f"importance="
                    f"{score:.3f}, "
                    f"type="
                    f"{memory_create.memory_type.value}"
                )
            )

            if (
                not store_allowed
                or score
                <
                settings.importance_threshold
            ):

                logger.info(
                    "Memory discarded: below threshold"
                )

                raise (
                    IngestionDiscardedError(
                        "below_threshold"
                    )
                )



            duplicate, existing = (
                await check_duplicate(
                    memory_create,
                    memory_create.user_id,
                )
            )

            logger.info(
                (
                    "Dedup complete: "
                    f"duplicate="
                    f"{duplicate}"
                )
            )

            if duplicate:

                raise (
                    IngestionDiscardedError(
                        (
                            "duplicate:"
                            f"{existing}"
                        )
                    )
                )



            store = (
                STORE_MAP
                .get(
                    memory_create
                    .memory_type
                )
            )

            if (
                store
                is None
            ):
                raise (
                    IngestionGatewayError(
                        (
                            "Store not available "
                            f"for "
                            f"{memory_create.memory_type.value}"
                        )
                    )
                )



            try:

                memory = (
                    await store.save(
                        memory_create
                    )
                )

            except Exception as exc:

                logger.exception(
                    "Primary storage failed"
                )

                raise (
                    IngestionGatewayError(
                        (
                            "Storage failed: "
                            f"{exc}"
                        )
                    )
                ) from exc



            asyncio.create_task(
                _background_qdrant(
                    memory
                )
            )

            asyncio.create_task(
                _background_graph(
                    memory
                )
            )

            logger.info(
                (
                    "Memory ingestion complete"
                )
            )

            return memory



        except (
            IngestionDiscardedError
        ):

            return None

        except Exception as exc:

            raise (
                IngestionGatewayError(
                    (
                        "Memory ingestion failed: "
                        f"{exc}"
                    )
                )
            ) from exc


__all__ = [
    "MemoryIngestionGateway",
    "IngestionGatewayError",
    "IngestionDiscardedError",
]