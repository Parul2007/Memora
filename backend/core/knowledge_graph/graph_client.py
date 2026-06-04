# core/knowledge_graph/graph_client.py
# Async Neo4j wrapper for Memora knowledge graph operations.
# Provides typed node/relationship primitives and a safe query interface.

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from backend.models.memory import Memory


logger = logging.getLogger(__name__)


class GraphClientError(Exception):
    """Raised for graph operations."""


CREATE_ENTITY = """
MERGE (
    e:Entity {
        text: $text,
        user_id: $user_id
    }
)
SET
    e.label = $label,
    e.updated_at = datetime()
RETURN elementId(e) AS node_id
"""

CREATE_MEMORY = """
MERGE (
    m:Memory {
        id: $memory_id
    }
)
SET
    m.type = $type,
    m.importance = $importance,
    m.created_at = datetime(
        $created_at
    )
"""

LINK_MEMORY = """
MATCH (
    e:Entity {
        text: $text,
        user_id: $uid
    }
),
(
    m:Memory {
        id: $mid
    }
)

MERGE
(
    e
)-[
    :MENTIONED_IN
]->
(
    m
)
"""

RELATED_QUERY = """
MATCH (
    e:Entity {
        text: $text,
        user_id: $uid
    }
)
-
[
    :RELATED_TO*1..%d
]
-
(
    related
)

RETURN related
"""


class GraphClient:

    def __init__(
        self,
        driver,
    ) -> None:
        self.driver = (
            driver
        )



    async def create_entity_node(
        self,
        entity_text: str,
        entity_label: str,
        user_id: UUID,
    ) -> str:

        try:

            async with (
                self.driver.session()
                as session
            ):

                result = (
                    await session.run(
                        CREATE_ENTITY,
                        text=entity_text,
                        label=entity_label,
                        user_id=str(
                            user_id
                        ),
                    )
                )

                record = (
                    await result.single()
                )

            if (
                record
                is None
            ):
                raise GraphClientError(
                    (
                        "Entity creation "
                        "returned no node"
                    )
                )

            node_id = (
                record[
                    "node_id"
                ]
            )

            logger.debug(
                (
                    "Created entity "
                    f"{entity_text}"
                )
            )

            return str(
                node_id
            )

        except Exception as exc:

            raise (
                GraphClientError(
                    (
                        "Entity create "
                        f"failed: {exc}"
                    )
                )
            ) from exc



    async def create_memory_node(
        self,
        memory: Memory,
    ) -> None:

        try:

            async with (
                self.driver.session()
                as session
            ):

                await session.run(
                    CREATE_MEMORY,
                    memory_id=str(
                        memory.id
                    ),
                    type=(
                        memory
                        .memory_type
                        .value
                    ),
                    importance=(
                        memory
                        .importance_score
                    ),
                    created_at=(
                        memory
                        .created_at
                        .isoformat()
                    ),
                )

            logger.debug(
                (
                    "Created memory node "
                    f"{memory.id}"
                )
            )

        except Exception as exc:

            raise (
                GraphClientError(
                    (
                        "Memory node "
                        f"failed: {exc}"
                    )
                )
            ) from exc



    async def link_entity_to_memory(
        self,
        entity_text: str,
        memory_id: UUID,
        user_id: UUID,
    ) -> None:

        try:

            async with (
                self.driver.session()
                as session
            ):

                await session.run(
                    LINK_MEMORY,
                    text=entity_text,
                    uid=str(
                        user_id
                    ),
                    mid=str(
                        memory_id
                    ),
                )

            logger.debug(
                (
                    "Linked entity "
                    f"{entity_text}"
                )
            )

        except Exception as exc:

            raise (
                GraphClientError(
                    (
                        "Entity link "
                        f"failed: {exc}"
                    )
                )
            ) from exc



    async def get_related_entities(
        self,
        entity_text: str,
        user_id: UUID,
        depth: int = 2,
    ) -> list[
        dict[str, Any]
    ]:

        try:

            query = (
                RELATED_QUERY
                % depth
            )

            async with (
                self.driver.session()
                as session
            ):

                result = (
                    await session.run(
                        query,
                        text=entity_text,
                        uid=str(
                            user_id
                        ),
                    )
                )

                rows = (
                    await result.data()
                )

            return [
                dict(
                    row
                )
                for row
                in rows
            ]

        except Exception as exc:

            raise (
                GraphClientError(
                    (
                        "Related lookup "
                        f"failed: {exc}"
                    )
                )
            ) from exc



    async def run_query(
        self,
        cypher: str,
        params: dict,
    ) -> list[
        dict[str, Any]
    ]:

        try:

            async with (
                self.driver.session()
                as session
            ):

                result = (
                    await session.run(
                        cypher,
                        **params,
                    )
                )

                rows = (
                    await result.data()
                )

            return [
                dict(
                    row
                )
                for row
                in rows
            ]

        except Exception as exc:

            raise (
                GraphClientError(
                    (
                        "Query failed: "
                        f"{exc}"
                    )
                )
            ) from exc



    async def close(
        self,
    ) -> None:

        try:

            await self.driver.close()

            logger.debug(
                "Neo4j closed"
            )

        except Exception as exc:

            raise (
                GraphClientError(
                    (
                        "Close failed: "
                        f"{exc}"
                    )
                )
            ) from exc


__all__ = [
    "GraphClient",
    "GraphClientError",
]