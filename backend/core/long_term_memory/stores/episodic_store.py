# core/long_term_memory/stores/episodic_store.py
# PostgreSQL warm-store implementation for episodic memories.
# Handles storage, retrieval, vector search, decay updates,
# and lifecycle cleanup for time-sensitive memories.

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import text

from backend.config import settings

from backend.db.postgres import (
    get_async_session,
)

from backend.models.memory import (
    Memory,
    MemoryCreate,
)


logger = logging.getLogger(__name__)


INSERT_MEMORY = text(
    """
    INSERT INTO memories (
        user_id,
        content,
        memory_type,
        embedding,
        importance_score,
        emotional_weight,
        decay_factor,
        expires_at,
        source_session_id,
        entities,
        metadata
    )
    VALUES (
        :user_id,
        :content,
        :memory_type,
        CAST(:embedding AS vector),
        :importance_score,
        :emotional_weight,
        :decay_factor,
        :expires_at,
        :source_session_id,
        CAST(:entities AS jsonb),
        CAST(:metadata AS jsonb)
    )
    RETURNING *
    """
)

GET_MEMORY = text(
    """
    UPDATE memories
    SET
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE
        id = :memory_id
        AND user_id = :user_id
        AND memory_type = 'episodic'
    RETURNING *
    """
)

SEARCH_VECTOR = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'episodic'
        AND importance_score >= :min_importance
        AND (
            expires_at IS NULL
            OR expires_at > NOW()
        )
    ORDER BY
        embedding <=> CAST(:embedding AS vector)
    LIMIT :top_k
    """
)

UPDATE_DECAY = text(
    """
    UPDATE memories
    SET
        decay_factor = :decay
    WHERE id = :memory_id
    """
)

DELETE_EXPIRED = text(
    """
    DELETE FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'episodic'
        AND expires_at < NOW()
    """
)


class EpisodicStoreError(Exception):
    """Raised for episodic store failures."""


class EpisodicStore:

    def __init__(
        self,
        session_factory=get_async_session,
    ) -> None:
        self.session_factory = (
            session_factory
        )

    @staticmethod
    def _validate_embedding(
        embedding: list[float],
    ) -> None:

        if (
            len(embedding)
            != settings.embedding_dims
        ):
            raise EpisodicStoreError(
                (
                    "Invalid embedding "
                    f"dimension "
                    f"{len(embedding)}"
                )
            )

    @staticmethod
    def _expires_at(
        importance: float,
    ) -> datetime:

        ttl_days = max(
            1.0,
            (
                settings.warm_store_days
                *
                max(
                    importance,
                    0.05,
                )
            ),
        )

        return (
            datetime.now(
                timezone.utc
            )
            +
            timedelta(
                days=ttl_days
            )
        )

    @staticmethod
    def _to_memory(
        row,
    ) -> Memory:

        return Memory.model_validate(
            dict(
                row._mapping
            )
        )



    async def save(
        self,
        memory_create: MemoryCreate,
    ) -> Memory:

        try:

            self._validate_embedding(
                memory_create.embedding
            )

            importance = (
                memory_create
                .importance_score
            )

            expires_at = (
                self._expires_at(
                    importance
                )
            )

            payload = (
                memory_create
                .model_dump(
                    mode="json"
                )
            )
            payload["embedding"] = str(payload["embedding"])
            payload.update({
                "memory_type":
                    memory_create
                    .memory_type
                    .value,
                "decay_factor":
                    (
                        1.0
                        -
                        settings.decay_rate
                    ),
                "expires_at":
                    expires_at,
            })

            async with (
                self.session_factory()
                as session
            ):

                result = (
                    await session.execute(
                        INSERT_MEMORY,
                        payload,
                    )
                )

                await session.commit()

                row = (
                    result.first()
                )

            if row is None:
                raise EpisodicStoreError(
                    "Insert failed"
                )

            logger.debug(
                "Saved episodic memory"
            )

            return self._to_memory(
                row
            )

        except Exception as exc:

            raise (
                EpisodicStoreError(
                    f"Save failed: {exc}"
                )
            ) from exc



    async def get(
        self,
        memory_id: UUID,
        user_id: UUID,
    ) -> Optional[
        Memory
    ]:

        try:

            async with (
                self.session_factory()
                as session
            ):

                result = (
                    await session.execute(
                        GET_MEMORY,
                        {
                            "memory_id":
                                memory_id,
                            "user_id":
                                user_id,
                        },
                    )
                )

                await session.commit()

                row = (
                    result.first()
                )

            logger.debug(
                "Fetched episodic memory"
            )

            if row is None:
                return None

            return self._to_memory(
                row
            )

        except Exception as exc:

            raise (
                EpisodicStoreError(
                    f"Get failed: {exc}"
                )
            ) from exc



    async def search_by_vector(
        self,
        query_embedding: list[
            float
        ],
        user_id: UUID,
        top_k: int = 15,
        min_importance: float = 0.0,
    ) -> list[
        Memory
    ]:

        try:

            self._validate_embedding(
                query_embedding
            )

            async with (
                self.session_factory()
                as session
            ):

                result = (
                    await session.execute(
                        SEARCH_VECTOR,
                        {
                            "embedding":
                                str(query_embedding),
                            "user_id":
                                user_id,
                            "top_k":
                                top_k,
                            "min_importance":
                                min_importance,
                        },
                    )
                )

                rows = (
                    result.fetchall()
                )

            logger.debug(
                (
                    "Vector search returned "
                    f"{len(rows)}"
                )
            )

            return [
                self._to_memory(
                    row
                )
                for row
                in rows
            ]

        except Exception as exc:

            raise (
                EpisodicStoreError(
                    f"Search failed: {exc}"
                )
            ) from exc



    async def update_decay(
        self,
        memory_id: UUID,
        new_decay_factor: float,
    ) -> None:

        try:

            async with (
                self.session_factory()
                as session
            ):

                await session.execute(
                    UPDATE_DECAY,
                    {
                        "memory_id":
                            memory_id,
                        "decay":
                            new_decay_factor,
                    },
                )

                await session.commit()

            logger.debug(
                (
                    "Decay updated "
                    f"{memory_id}"
                )
            )

        except Exception as exc:

            raise (
                EpisodicStoreError(
                    f"Decay update failed: {exc}"
                )
            ) from exc



    async def delete_expired(
        self,
        user_id: UUID,
    ) -> int:

        try:

            async with (
                self.session_factory()
                as session
            ):

                result = (
                    await session.execute(
                        DELETE_EXPIRED,
                        {
                            "user_id":
                                user_id
                        },
                    )
                )

                await session.commit()

            deleted = (
                result.rowcount
                or 0
            )

            logger.debug(
                (
                    "Deleted expired "
                    f"{deleted}"
                )
            )

            return deleted

        except Exception as exc:

            raise (
                EpisodicStoreError(
                    (
                        "Delete expired "
                        f"failed: {exc}"
                    )
                )
            ) from exc


episodic_store = (
    EpisodicStore()
)


__all__ = [
    "EpisodicStore",
    "EpisodicStoreError",
    "episodic_store",
]