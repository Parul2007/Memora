# core/long_term_memory/lifecycle/retention_engine.py
# Memory retention and archival lifecycle engine.
# Migrates old high-value memories into Qdrant cold storage and
# removes low-value or expired memories from PostgreSQL.

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text

from backend.config import settings

from backend.db.postgres import (
    get_async_session,
)

from backend.db.qdrant_client import (
    get_qdrant_client,
)

from backend.models.memory import (
    Memory,
)


logger = logging.getLogger(__name__)

COLLECTION = "memories"


SELECT_CANDIDATES = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND created_at <
            NOW()
            - (
                :days
                * INTERVAL '1 day'
            )
    """
)

DELETE_MEMORY = text(
    """
    DELETE FROM memories
    WHERE
        id = :memory_id
    """
)

DELETE_EXPIRED = text(
    """
    DELETE FROM memories
    WHERE
        user_id = :user_id
        AND memory_type IN (
            'episodic',
            'emotional'
        )
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
    """
)


class RetentionError(Exception):
    """Raised for retention failures."""


@dataclass(slots=True)
class RetentionResult:
    archived_count: int
    deleted_count: int
    duration_seconds: float


class RetentionEngine:

    async def archive_to_qdrant(
        self,
        memory: Memory,
    ) -> None:

        try:

            client = (
                await get_qdrant_client()
            )

            await client.upsert(
                collection_name=(
                    COLLECTION
                ),
                points=[
                    {
                        "id":
                            str(
                                memory.id
                            ),

                        "vector":
                            memory.embedding,

                        "payload": {
                            "user_id":
                                str(
                                    memory.user_id
                                ),

                            "content":
                                memory.content,

                            "memory_type":
                                memory.memory_type.value,

                            "importance_score":
                                memory.importance_score,

                            "emotional_weight":
                                memory.emotional_weight,

                            "entities":
                                memory.entities,

                            "created_at":
                                (
                                    memory
                                    .created_at
                                    .isoformat()
                                ),
                        },
                    }
                ],
            )

            logger.info(
                (
                    "Archived memory "
                    f"{memory.id}"
                )
            )

        except Exception as exc:

            raise (
                RetentionError(
                    (
                        "Qdrant archive failed: "
                        f"{exc}"
                    )
                )
            ) from exc



    async def delete_from_postgres(
        self,
        memory_id: UUID,
    ) -> None:

        try:

            async with (
                get_async_session()
                as session
            ):

                await session.execute(
                    DELETE_MEMORY,
                    {
                        "memory_id":
                            memory_id
                    },
                )

                await session.commit()

            logger.info(
                (
                    "Deleted memory "
                    f"{memory_id}"
                )
            )

        except Exception as exc:

            raise (
                RetentionError(
                    (
                        "Delete failed: "
                        f"{exc}"
                    )
                )
            ) from exc



    async def run_retention_pass(
        self,
        user_id: UUID,
    ) -> RetentionResult:

        started = (
            time.perf_counter()
        )

        archived = 0
        deleted = 0

        try:

            async with (
                get_async_session()
                as session
            ):

                result = (
                    await session.execute(
                        SELECT_CANDIDATES,
                        {
                            "user_id":
                                user_id,
                            "days":
                                settings.warm_store_days,
                        },
                    )
                )

                rows = (
                    result.fetchall()
                )

            memories = [
                Memory.model_validate(
                    dict(
                        row._mapping
                    )
                )
                for row
                in rows
            ]

            logger.info(
                (
                    "Retention pass: "
                    f"{len(memories)} "
                    "candidates"
                )
            )

            for memory in memories:

                try:

                    if (
                        memory
                        .importance_score
                        >=
                        settings.importance_threshold
                    ):

                        await (
                            self
                            .archive_to_qdrant(
                                memory
                            )
                        )

                        archived += 1

                    await (
                        self
                        .delete_from_postgres(
                            memory.id
                        )
                    )

                    deleted += 1

                except Exception:

                    logger.exception(
                        (
                            "Retention failure "
                            f"{memory.id}"
                        )
                    )

            async with (
                get_async_session()
                as session
            ):

                expired = (
                    await session.execute(
                        DELETE_EXPIRED,
                        {
                            "user_id":
                                user_id
                        },
                    )
                )

                await session.commit()

                deleted += (
                    expired.rowcount
                    or 0
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
                    "Retention complete "
                    f"(archived="
                    f"{archived}, "
                    f"deleted="
                    f"{deleted})"
                )
            )

            return (
                RetentionResult(
                    archived_count=(
                        archived
                    ),

                    deleted_count=(
                        deleted
                    ),

                    duration_seconds=(
                        duration
                    ),
                )
            )

        except Exception as exc:

            raise (
                RetentionError(
                    (
                        "Retention pass failed: "
                        f"{exc}"
                    )
                )
            ) from exc


__all__ = [
    "RetentionEngine",
    "RetentionResult",
    "RetentionError",
]