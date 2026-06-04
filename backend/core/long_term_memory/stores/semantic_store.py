# core/long_term_memory/stores/semantic_store.py
# PostgreSQL store for semantic memories.
# Semantic memories represent facts, beliefs, preferences, and knowledge.
# These memories never expire and support belief updates instead of duplication.

from __future__ import annotations

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
    MemoryUpdate,
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
        is_consolidated,
        source_session_id,
        entities,
        metadata
    )
    VALUES (
        :user_id,
        :content,
        'semantic',
        CAST(:embedding AS vector),
        :importance_score,
        :emotional_weight,
        1.0,
        NULL,
        FALSE,
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
        AND memory_type = 'semantic'
    RETURNING *
    """
)


SEARCH_VECTOR = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'semantic'
    ORDER BY
        embedding <=> CAST(:embedding AS vector)
    LIMIT :top_k
    """
)


UPDATE_BELIEF = text(
    """
    UPDATE memories
    SET
        content = COALESCE(
            :content,
            content
        ),

        importance_score = COALESCE(
            :importance_score,
            importance_score
        ),

        entities = COALESCE(
            CAST(:entities AS jsonb),
            entities
        ),

        metadata = COALESCE(
            CAST(:metadata AS jsonb),
            metadata
        ),

        updated_at = NOW(),

        is_consolidated = FALSE

    WHERE
        id = :memory_id
        AND memory_type = 'semantic'

    RETURNING *
    """
)


GET_ALL = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'semantic'
    ORDER BY
        updated_at DESC
    """
)


GET_BY_SESSION = text(
    """
    SELECT *
    FROM memories
    WHERE
        user_id = :user_id
        AND memory_type = 'semantic'
        AND metadata->>'session_id' = :session_id
    ORDER BY
        updated_at DESC
    """
)


class SemanticStoreError(Exception):
    """Raised for semantic store failures."""


class SemanticStore:

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
            raise SemanticStoreError(
                (
                    "Invalid embedding "
                    f"dimension "
                    f"{len(embedding)}"
                )
            )

    @staticmethod
    def _hydrate(
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

            payload = (
                memory_create
                .model_dump(
                    mode="json"
                )
            )
            payload["embedding"] = str(payload["embedding"])

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
                raise SemanticStoreError(
                    "Insert failed"
                )

            logger.debug(
                "Saved semantic memory"
            )

            return self._hydrate(
                row
            )

        except Exception as exc:

            raise (
                SemanticStoreError(
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
                "Fetched semantic memory"
            )

            if row is None:
                return None

            return self._hydrate(
                row
            )

        except Exception as exc:

            raise (
                SemanticStoreError(
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
                    "Semantic vector search "
                    f"returned {len(rows)}"
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
                SemanticStoreError(
                    f"Search failed: {exc}"
                )
            ) from exc



    async def update_belief(
        self,
        memory_id: UUID,
        update: MemoryUpdate,
    ) -> Memory:

        try:

            payload = (
                update.model_dump(
                    exclude_none=True,
                    mode="json",
                )
            )

            payload[
                "memory_id"
            ] = memory_id

            async with (
                self.session_factory()
                as session
            ):

                result = (
                    await session.execute(
                        UPDATE_BELIEF,
                        payload,
                    )
                )

                await session.commit()

                row = (
                    result.first()
                )

            if row is None:
                raise SemanticStoreError(
                    "Memory not found"
                )

            logger.debug(
                (
                    "Updated belief "
                    f"{memory_id}"
                )
            )

            return self._hydrate(
                row
            )

        except Exception as exc:

            raise (
                SemanticStoreError(
                    (
                        "Belief update "
                        f"failed: {exc}"
                    )
                )
            ) from exc



    async def get_all_for_user(
        self,
        user_id: UUID,
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
                        GET_ALL,
                        {
                            "user_id":
                                user_id
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
                    "semantic memories"
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
                SemanticStoreError(
                    (
                        "Fetch all failed: "
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
                    "semantic session memories"
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
                SemanticStoreError(
                    (
                        "Fetch session memories failed: "
                        f"{exc}"
                    )
                )
            ) from exc


semantic_store = (
    SemanticStore()
)


__all__ = [
    "SemanticStore",
    "SemanticStoreError",
    "semantic_store",
]