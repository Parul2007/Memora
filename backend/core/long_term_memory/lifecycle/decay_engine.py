# core/long_term_memory/lifecycle/decay_engine.py
# Applies time-based memory decay for episodic and emotional memories.
# Runs asynchronously via Celery and gradually reduces retention strength.

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import text

from backend.config import settings

from backend.db.postgres import (
    get_async_session,
)

from backend.models.memory import (
    Memory,
    MemoryType,
)

from backend.core.long_term_memory.stores.episodic_store import (
    episodic_store,
)

from backend.core.long_term_memory.stores.emotional_store import (
    emotional_store,
)


logger = logging.getLogger(__name__)


DECAY_TARGETS = [
    MemoryType.EPISODIC,
    MemoryType.EMOTIONAL,
]


GET_DECAY_CANDIDATES = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type IN (
            'episodic',
            'emotional'
        )
        AND decay_factor > 0.0
        AND (
            expires_at IS NULL
            OR expires_at > NOW()
        )
    """
)

FLAG_EXPIRED = text(
    """
    UPDATE memories
    SET
        expires_at = NOW(),
        updated_at = NOW()
    WHERE id = :memory_id
    """
)


class DecayError(Exception):
    """Raised for decay failures."""


@dataclass(slots=True)
class DecayResult:
    memories_decayed: int
    memories_expired: int
    duration_seconds: float


class DecayEngine:

    async def get_decay_candidates(
        self,
        user_id: UUID,
    ) -> list[
        Memory
    ]:

        try:

            async with (
                get_async_session()
                as session
            ):

                result = (
                    await session.execute(
                        GET_DECAY_CANDIDATES,
                        {
                            "user_id":
                                user_id
                        },
                    )
                )

                rows = (
                    result.fetchall()
                )

            return [
                Memory.model_validate(
                    dict(
                        row._mapping
                    )
                )
                for row
                in rows
            ]

        except Exception as exc:

            raise (
                DecayError(
                    (
                        "Failed loading "
                        f"decay candidates: "
                        f"{exc}"
                    )
                )
            ) from exc



    async def _update_decay(
        self,
        memory: Memory,
        decay: float,
    ) -> None:

        if (
            memory.memory_type
            ==
            MemoryType.EPISODIC
        ):

            await episodic_store.update_decay(
                memory.id,
                decay,
            )

        elif (
            memory.memory_type
            ==
            MemoryType.EMOTIONAL
        ):

            await emotional_store.update_decay(
                memory.id,
                decay,
            )



    async def _expire(
        self,
        memory_id: UUID,
    ) -> None:

        async with (
            get_async_session()
            as session
        ):

            await session.execute(
                FLAG_EXPIRED,
                {
                    "memory_id":
                        memory_id
                },
            )

            await session.commit()



    async def run_decay_pass(
        self,
        user_id: UUID,
    ) -> DecayResult:

        started = (
            time.perf_counter()
        )

        decayed = 0
        expired = 0

        try:

            memories = (
                await self
                .get_decay_candidates(
                    user_id
                )
            )

            now = (
                datetime.now(
                    timezone.utc
                )
            )

            for memory in memories:

                try:

                    reference = (
                        memory
                        .last_accessed_at
                        or
                        memory
                        .created_at
                    )

                    days = max(
                        (
                            now
                            -
                            reference
                        ).days,
                        0,
                    )

                    reduction = (
                        settings.decay_rate
                        *
                        days
                    )

                    new_decay = max(
                        0.0,
                        (
                            memory
                            .decay_factor
                            -
                            reduction
                        ),
                    )

                    await (
                        self
                        ._update_decay(
                            memory,
                            new_decay,
                        )
                    )

                    decayed += 1

                    if (
                        new_decay
                        < 0.1
                    ):

                        await (
                            self
                            ._expire(
                                memory.id
                            )
                        )

                        expired += 1

                except Exception:

                    logger.exception(
                        (
                            "Decay failed "
                            f"{memory.id}"
                        )
                    )

            duration = round(
                (
                    time.perf_counter()
                    -
                    started
                ),
                2,
            )

            logger.info(
                (
                    "Decay pass: "
                    f"{decayed} "
                    "memories updated, "
                    f"{expired} "
                    "expired"
                )
            )

            return (
                DecayResult(
                    memories_decayed=(
                        decayed
                    ),

                    memories_expired=(
                        expired
                    ),

                    duration_seconds=(
                        duration
                    ),
                )
            )

        except Exception as exc:

            raise (
                DecayError(
                    (
                        "Decay pass failed: "
                        f"{exc}"
                    )
                )
            ) from exc


__all__ = [
    "DecayEngine",
    "DecayResult",
    "DecayError",
    "DECAY_TARGETS",
]