# core/long_term_memory/stores/emotional_store.py
# PostgreSQL store for emotional memories.
# Optimized for emotion-aware retrieval and emotional baseline estimation.
# Emotional memories decay faster and influence response tone adaptation.

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import text

from backend.config import settings

from backend.db.postgres import (
    AsyncSessionLocal,
)

from backend.models.memory import (
    Memory,
    MemoryCreate,
    MemoryUpdate,
)


logger = logging.getLogger(__name__)

EMOTIONAL_DECAY_MULTIPLIER = 1.5


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
        'emotional',
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
        AND memory_type = 'emotional'
    RETURNING *
    """
)

SEARCH_VECTOR = text(
    """
    SELECT *,
        (
            (
                0.5 *
                (
                    1 -
                    (
                        embedding
                        <=>
                        CAST(:embedding AS vector)
                    )
                )
            )
            +
            (
                0.5 *
                ABS(
                    emotional_weight
                )
            )
        )
        AS rank_score

    FROM memories

    WHERE
        user_id = :user_id
        AND memory_type = 'emotional'

    ORDER BY
        rank_score DESC

    LIMIT :top_k
    """
)

EMOTIONAL_BASELINE = text(
    """
    SELECT
        AVG(
            emotional_weight
        ) AS baseline
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'emotional'
        AND created_at >
            NOW()
            -
            (
                :days
                * INTERVAL '1 day'
            )
    """
)

RECENT_EMOTIONS = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'emotional'
    ORDER BY
        created_at DESC,
        ABS(
            emotional_weight
        ) DESC
    LIMIT :limit
    """
)


GET_BY_SESSION = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'emotional'
        AND metadata->>'session_id' = :session_id
    ORDER BY
        created_at DESC
    """
)


class EmotionalStoreError(Exception):
    """Raised for emotional store failures."""


class EmotionalStore:

    def __init__(
        self,
        session_factory=AsyncSessionLocal,
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
            raise EmotionalStoreError(
                (
                    "Invalid embedding "
                    f"dimension "
                    f"{len(embedding)}"
                )
            )

    @staticmethod
    def _expires_at(
        emotional_weight: float,
    ) -> datetime:

        days = (
            14
            if abs(
                emotional_weight
            ) > 0.7
            else 7
        )

        return (
            datetime.now(
                timezone.utc
            )
            +
            timedelta(
                days=days
            )
        )

    @staticmethod
    def _hydrate(
        row,
    ) -> Memory:
        data = dict(row._mapping)
        if isinstance(data.get("embedding"), str):
            import json
            try:
                data["embedding"] = json.loads(data["embedding"])
            except Exception:
                pass
        return Memory.model_validate(
            data
        )



    async def list_recent(
        self,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Memory]:
        try:
            query = text(
                """
                SELECT *
                FROM memories
                WHERE user_id = :user_id
                  AND memory_type = 'emotional'
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
                """
            )
            async with self.session_factory() as session:
                result = await session.execute(
                    query,
                    {
                        "user_id": user_id,
                        "limit": limit,
                        "offset": offset,
                    },
                )
                rows = result.fetchall()
            return [self._hydrate(row) for row in rows]
        except Exception as exc:
            raise EmotionalStoreError(f"List recent failed: {exc}") from exc

    async def save(
        self,
        memory_create: MemoryCreate,
    ) -> Memory:

        try:

            self._validate_embedding(
                memory_create.embedding
            )

            payload = (
                memory_create
                .model_dump(
                    mode="json"
                )
            )
            payload["embedding"] = str(payload["embedding"])

            payload[
                "expires_at"
            ] = (
                self._expires_at(
                    memory_create
                    .emotional_weight
                )
            )

            payload[
                "decay_factor"
            ] = (
                1.0
                -
                (
                    settings.decay_rate
                    *
                    EMOTIONAL_DECAY_MULTIPLIER
                )
            )

            import json
            payload["entities"] = json.dumps(payload.get("entities", []) or [])
            payload["metadata"] = json.dumps(payload.get("metadata", {}) or {})

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
                raise EmotionalStoreError(
                    "Insert failed"
                )

            logger.debug(
                "Saved emotional memory"
            )

            return self._hydrate(
                row
            )

        except Exception as exc:

            raise (
                EmotionalStoreError(
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
                "Fetched emotional memory"
            )

            return (
                None
                if row is None
                else self._hydrate(
                    row
                )
            )

        except Exception as exc:

            raise (
                EmotionalStoreError(
                    f"Get failed: {exc}"
                )
            ) from exc



    async def search_by_vector(
        self,
        query_embedding: list[
            float
        ],
        user_id: UUID,
        top_k: int = 10,
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
                        },
                    )
                )

                rows = (
                    result.fetchall()
                )

            logger.debug(
                (
                    "Emotional search "
                    f"returned "
                    f"{len(rows)}"
                )
            )

            return [
                self._hydrate(
                    row
                )
                for row
                in rows
            ]

        except Exception as exc:

            raise (
                EmotionalStoreError(
                    f"Search failed: {exc}"
                )
            ) from exc



    async def get_emotional_baseline(
        self,
        user_id: UUID,
        days: int = 7,
    ) -> float:

        try:

            async with (
                self.session_factory()
                as session
            ):

                result = (
                    await session.execute(
                        EMOTIONAL_BASELINE,
                        {
                            "user_id":
                                user_id,
                            "days":
                                days,
                        },
                    )
                )

                value = (
                    result.scalar()
                )

            baseline = (
                float(
                    value
                )
                if value
                is not None
                else 0.0
            )

            return max(
                -1.0,
                min(
                    1.0,
                    baseline,
                ),
            )

        except Exception as exc:

            raise (
                EmotionalStoreError(
                    (
                        "Baseline failed: "
                        f"{exc}"
                    )
                )
            ) from exc



    async def get_recent_emotions(
        self,
        user_id: UUID,
        limit: int = 5,
    ) -> list[
        Memory
    ]:

        try:

            async with (
                self.session_factory()
                as session
            ):

                result = (
                    await session.execute(
                        RECENT_EMOTIONS,
                        {
                            "user_id":
                                user_id,
                            "limit":
                                limit,
                        },
                    )
                )

                rows = (
                    result.fetchall()
                )

            logger.debug(
                (
                    "Fetched recent emotions "
                    f"{len(rows)}"
                )
            )

            return [
                self._hydrate(
                    row
                )
                for row
                in rows
            ]

        except Exception as exc:

            raise (
                EmotionalStoreError(
                    (
                        "Recent emotions failed: "
                        f"{exc}"
                    )
                )
            ) from exc



    async def get_by_session(
        self,
        user_id: UUID,
        session_id: str,
    ) -> list[
        Memory
    ]:

        try:

            async with (
                self.session_factory()
                as session
            ):

                result = (
                    await session.execute(
                        GET_BY_SESSION,
                        {
                            "user_id":
                                user_id,
                            "session_id":
                                session_id
                        },
                    )
                )

                rows = (
                    result.fetchall()
                )

            logger.debug(
                (
                    "Fetched "
                    f"{len(rows)} "
                    "emotional session memories"
                )
            )

            return [
                self._hydrate(
                    row
                )
                for row
                in rows
            ]

        except Exception as exc:

            raise (
                EmotionalStoreError(
                    (
                        "Fetch session memories failed: "
                        f"{exc}"
                    )
                )
            ) from exc


emotional_store = (
    EmotionalStore()
)


__all__ = [
    "EmotionalStore",
    "EmotionalStoreError",
    "emotional_store",
]