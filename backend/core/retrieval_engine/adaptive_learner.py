"""
backend/core/retrieval_engine/adaptive_learner.py

Learns from retrieval usage and reinforces useful memories.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from backend.models.memory import MemoryUpdate
from backend.core.long_term_memory.stores.episodic_store import EpisodicStore
from backend.core.long_term_memory.stores.semantic_store import SemanticStore
from backend.core.long_term_memory.stores.procedural_store import ProceduralStore
from backend.core.long_term_memory.stores.emotional_store import EmotionalStore
from backend.core.working_memory.session_store import SessionStore as session_store


logger = logging.getLogger(__name__)


class AdaptiveLearnerError(Exception):
    """Raised for adaptive learner failures."""


class AdaptiveLearner:
    def __init__(self) -> None:
        self._stores = {
            "episodic": EpisodicStore(),
            "semantic": SemanticStore(),
            "procedural": ProceduralStore(),
            "emotional": EmotionalStore(),
        }

    async def _get_memory_and_store(
        self,
        memory_id: UUID,
        user_id: UUID,
    ):
        for memory_type, store in self._stores.items():
            try:
                memory = await store.get(
                    memory_id=memory_id,
                    user_id=user_id,
                )

                if memory:
                    return memory, store, memory_type

            except Exception:
                logger.debug(
                    "adaptive_lookup_failed",
                    extra={
                        "memory_id": str(memory_id),
                        "store": memory_type,
                    },
                    exc_info=True,
                )

        return None, None, None

    async def record_retrieval_usage(
        self,
        memory_ids: list[UUID],
        user_id: UUID,
    ) -> None:
        if not memory_ids:
            return

        now = datetime.now(timezone.utc)

        for memory_id in memory_ids:
            try:
                memory, store, _ = await self._get_memory_and_store(
                    memory_id,
                    user_id,
                )

                if not memory:
                    continue

                update = MemoryUpdate(
                    access_count=(
                        getattr(memory, "access_count", 0) + 1
                    ),
                    last_accessed_at=now,
                )

                await store.update(
                    memory_id=memory_id,
                    user_id=user_id,
                    update=update,
                )

            except Exception:
                logger.exception(
                    "record_retrieval_usage_failed",
                    extra={
                        "memory_id": str(memory_id),
                        "user_id": str(user_id),
                    },
                )

    async def boost_useful_memory(
        self,
        memory_id: UUID,
        user_id: UUID,
        boost_amount: float = 0.05,
    ) -> None:
        try:
            memory, store, _ = await self._get_memory_and_store(
                memory_id,
                user_id,
            )

            if not memory:
                return

            current = float(
                getattr(memory, "importance_score", 0.0)
            )

            update = MemoryUpdate(
                importance_score=min(
                    1.0,
                    current + boost_amount,
                )
            )

            await store.update(
                memory_id=memory_id,
                user_id=user_id,
                update=update,
            )

        except Exception:
            logger.exception(
                "boost_useful_memory_failed",
                extra={
                    "memory_id": str(memory_id),
                    "user_id": str(user_id),
                },
            )

    async def record_session_retrievals(
        self,
        session_id: UUID,
        memory_ids: list[UUID],
        user_id: UUID,
    ) -> None:
        try:
            key = (
                f"session:{session_id}:retrieved_memories"
            )

            payload = json.dumps(
                [str(memory_id) for memory_id in memory_ids]
            )

            await session_store.redis.set(
                key,
                payload,
            )

        except Exception:
            logger.exception(
                "record_session_retrievals_failed",
                extra={
                    "session_id": str(session_id),
                    "user_id": str(user_id),
                },
            )