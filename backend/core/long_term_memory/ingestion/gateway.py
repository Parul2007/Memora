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
import contextvars
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

# Context variable for per-task DB session factory.
# Celery workers and async tasks set this to their own task-local session
# factory instead of monkey-patching the global AsyncSessionLocal.
# This prevents cross-worker connection contamination ("another operation
# is in progress" errors) when multiple Celery workers run concurrently.
from backend.db.postgres import task_session_var



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
    "backend.core.long_term_memory.stores.episodic_store",
    "episodic_store",
)

semantic_store = _safe_import(
    "backend.core.long_term_memory.stores.semantic_store",
    "semantic_store",
)

procedural_store = _safe_import(
    "backend.core.long_term_memory.stores.procedural_store",
    "procedural_store",
)

emotional_store = _safe_import(
    "backend.core.long_term_memory.stores.emotional_store",
    "emotional_store",
)

from backend.core.events.event_types import DomainEvent, EventType
from backend.core.events.event_publisher import publish_event
from backend.models.memory import MemoryType

STORE_MAP = {
    MemoryType.EPISODIC: episodic_store,
    MemoryType.SEMANTIC: semantic_store,
    MemoryType.PROCEDURAL: procedural_store,
    MemoryType.EMOTIONAL: emotional_store,
}


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

        # Task-local session factory is handled transparently by postgres.py's
        # _AsyncSessionLocalProxy. When indexing_worker sets task_session_var,
        # the proxy lazily resolves to the correct factory on every call.
        # No global state mutation occurs. No monkey-patching.
        return await self._ingest_inner(memory_create)

    async def _ingest_inner(
        self,
        memory_create: MemoryCreate,
    ) -> Memory | None:

        try:

            perception = PerceptionResult(
                text=memory_create.content,
                embedding=memory_create.embedding,
                entities=[{"text": entity} for entity in memory_create.entities],
                memory_type=memory_create.memory_type,
                classification_scores={},
            )

            score = await compute_importance(
                perception,
                emotional_weight=memory_create.emotional_weight,
            )

            store_allowed = await should_store(score)

            logger.info(
                "Ingesting memory: importance=%.3f, type=%s",
                score,
                memory_create.memory_type.value,
            )

            if not store_allowed or score < settings.importance_threshold:
                logger.info("Memory discarded: below threshold")
                raise IngestionDiscardedError("below_threshold")

            duplicate, existing = await check_duplicate(
                memory_create,
                memory_create.user_id,
            )

            logger.info("Dedup complete: duplicate=%s", duplicate)

            if duplicate:
                raise IngestionDiscardedError(f"duplicate:{existing}")

            store = STORE_MAP.get(memory_create.memory_type)

            if store is None:
                raise IngestionGatewayError(
                    f"Store not available for {memory_create.memory_type.value}"
                )

            try:
                memory = await store.save(memory_create)
            except Exception as exc:
                logger.exception("Primary storage failed")
                raise IngestionGatewayError(f"Storage failed: {exc}") from exc

            await publish_event(DomainEvent(
                type=EventType.MemoryCreated,
                user_id=str(memory.user_id),
                payload={"memory": memory.model_dump(mode='json')}
            ))

            logger.info("Memory ingestion complete")
            return memory

        except IngestionDiscardedError:
            return None
        except Exception as exc:
            raise IngestionGatewayError(f"Memory ingestion failed: {exc}") from exc


__all__ = [
    "MemoryIngestionGateway",
    "IngestionGatewayError",
    "IngestionDiscardedError",
    "task_session_var",
]