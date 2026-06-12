# core/long_term_memory/stores/procedural_store.py
# PostgreSQL store for procedural memories.
# Stores habits, routines, and behavioral patterns.
# Procedural memories never expire and strengthen through reinforcement.

from __future__ import annotations

import logging
from datetime import datetime, timezone
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
)


logger = logging.getLogger(__name__)

IMPORTANCE_INCREMENT = 0.05


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
        access_count,
        source_session_id,
        entities,
        metadata
    )
    VALUES (
        :user_id,
        :content,
        'procedural',
        CAST(:embedding AS vector),
        :importance_score,
        :emotional_weight,
        1.0,
        NULL,
        0,
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
        AND memory_type = 'procedural'
    RETURNING *
    """
)

SEARCH_VECTOR = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'procedural'
    ORDER BY
        embedding <=> CAST(:embedding AS vector)
    LIMIT :top_k
    """
)

GET_METADATA = text(
    """
    SELECT
        metadata,
        importance_score,
        access_count
    FROM memories
    WHERE
        id = :memory_id
        AND user_id = :user_id
        AND memory_type = 'procedural'
    """
)

REINFORCE = text(
    """
    UPDATE memories
    SET
        importance_score = :importance_score,
        access_count = access_count + 1,
        metadata = CAST(:metadata AS jsonb),
        updated_at = NOW()
    WHERE
        id = :memory_id
        AND user_id = :user_id
        AND memory_type = 'procedural'
    RETURNING *
    """
)

TOP_HABITS = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'procedural'
    ORDER BY
        importance_score DESC,
        access_count DESC
    LIMIT :limit
    """
)


class ProceduralStoreError(Exception):
    """Raised for procedural memory failures."""


class ProceduralStore:

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

        if len(
            embedding
        ) != settings.embedding_dims:
            raise ProceduralStoreError(
                (
                    "Expected "
                    f"{settings.embedding_dims} "
                    "dimensions"
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
                  AND memory_type = 'procedural'
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
            raise ProceduralStoreError(f"List recent failed: {exc}") from exc

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

            metadata = (
                payload
                .get(
                    "metadata",
                    {},
                )
            )

            metadata.setdefault(
                "frequency",
                1,
            )

            metadata.setdefault(
                "last_observed",
                datetime.now(
                    timezone.utc
                ).isoformat(),
            )

            metadata.setdefault(
                "context_tags",
                [],
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
                raise ProceduralStoreError(
                    "Insert failed"
                )

            logger.debug(
                "Saved procedural memory"
            )

            return self._hydrate(
                row
            )

        except Exception as exc:

            raise (
                ProceduralStoreError(
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
                "Fetched procedural memory"
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
                ProceduralStoreError(
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
                    "Procedural search "
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
                ProceduralStoreError(
                    f"Search failed: {exc}"
                )
            ) from exc



    async def reinforce(
        self,
        memory_id: UUID,
        user_id: UUID,
    ) -> Memory:

        try:

            async with (
                self.session_factory()
                as session
            ):

                current = (
                    await session.execute(
                        GET_METADATA,
                        {
                            "memory_id":
                                memory_id,
                            "user_id":
                                user_id,
                        },
                    )
                ).first()

                if current is None:
                    raise ProceduralStoreError(
                        "Memory not found"
                    )

                metadata = (
                    current.metadata
                    or {}
                )

                metadata[
                    "frequency"
                ] = (
                    int(
                        metadata.get(
                            "frequency",
                            1,
                        )
                    )
                    + 1
                )

                metadata[
                    "last_observed"
                ] = (
                    datetime.now(
                        timezone.utc
                    ).isoformat()
                )

                importance = min(
                    float(
                        current.importance_score
                    )
                    +
                    IMPORTANCE_INCREMENT,
                    1.0,
                )

                updated = (
                    await session.execute(
                        REINFORCE,
                        {
                            "memory_id":
                                memory_id,
                            "user_id":
                                user_id,
                            "importance_score":
                                importance,
                            "metadata":
                                metadata,
                        },
                    )
                )

                await session.commit()

                row = (
                    updated.first()
                )

            if row is None:
                raise ProceduralStoreError(
                    "Reinforcement failed"
                )

            logger.debug(
                (
                    "Reinforced habit "
                    f"{memory_id}"
                )
            )

            return self._hydrate(
                row
            )

        except Exception as exc:

            raise (
                ProceduralStoreError(
                    (
                        "Reinforcement failed: "
                        f"{exc}"
                    )
                )
            ) from exc



    async def get_top_habits(
        self,
        user_id: UUID,
        limit: int = 10,
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
                        TOP_HABITS,
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
                    "Fetched top habits "
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
                ProceduralStoreError(
                    (
                        "Top habits failed: "
                        f"{exc}"
                    )
                )
            ) from exc


procedural_store = (
    ProceduralStore()
)


__all__ = [
    "ProceduralStore",
    "ProceduralStoreError",
    "procedural_store",
]