# core/knowledge_graph/relational_inference.py
# Traverses Neo4j knowledge graph to support multi-hop retrieval.
# Produces entity-aware context for downstream retrieval and reasoning.

from __future__ import annotations

import logging
from uuid import UUID

from backend.core.knowledge_graph.graph_client import (
    GraphClient,
)


logger = logging.getLogger(__name__)


class RelationalInferenceError(Exception):
    """Raised for graph inference failures."""


class RelationalInference:

    def __init__(
        self,
        graph_client: GraphClient,
    ) -> None:

        self.graph = (
            graph_client
        )



    async def find_entity_memories(
        self,
        entity_texts: list[str],
        user_id: UUID,
    ) -> list[
        UUID
    ]:
        """
        Find memories linked
        to supplied entities.
        """

        try:

            if not entity_texts:
                return []

            query = """
            MATCH
            (
                e:Entity
            )
            -
            [
                :MENTIONED_IN
            ]
            ->
            (
                m:Memory
            )

            WHERE
                e.text
                IN
                $entities

            AND
                e.user_id
                =
                $uid

            RETURN DISTINCT
                m.id
                AS memory_id
            """

            rows = (
                await self.graph
                .run_query(
                    query,
                    {
                        "entities":
                            entity_texts,

                        "uid":
                            str(
                                user_id
                            ),
                    },
                )
            )

            memory_ids = []

            for row in rows:

                try:

                    memory_ids.append(
                        UUID(
                            row[
                                "memory_id"
                            ]
                        )
                    )

                except Exception:
                    continue

            logger.debug(
                (
                    "Resolved "
                    f"{len(memory_ids)} "
                    "memory links"
                )
            )

            return memory_ids

        except Exception as exc:

            raise (
                RelationalInferenceError(
                    (
                        "Entity memory "
                        f"lookup failed: "
                        f"{exc}"
                    )
                )
            ) from exc



    async def find_related_concepts(
        self,
        entity_text: str,
        user_id: UUID,
        max_hops: int = 2,
    ) -> list[
        str
    ]:
        """
        Traverse RELATED_TO.
        """

        try:

            query = f"""
            MATCH
            (
                root:Entity {{
                    text:$text,
                    user_id:$uid
                }}
            )
            -
            [
                :RELATED_TO*1..{max_hops}
            ]
            -
            (
                related
            )

            RETURN DISTINCT
                related.text
                AS text
            """

            rows = (
                await self.graph
                .run_query(
                    query,
                    {
                        "text":
                            entity_text,

                        "uid":
                            str(
                                user_id
                            ),
                    },
                )
            )

            concepts = [
                row[
                    "text"
                ]
                for row
                in rows
                if row.get(
                    "text"
                )
            ]

            logger.debug(
                (
                    "Found "
                    f"{len(concepts)} "
                    "related concepts"
                )
            )

            return concepts

        except Exception as exc:

            raise (
                RelationalInferenceError(
                    (
                        "Concept traversal "
                        f"failed: {exc}"
                    )
                )
            ) from exc



    async def get_entity_context(
        self,
        entity_text: str,
        user_id: UUID,
    ) -> dict:
        """
        Build retrieval context
        for a single entity.
        """

        try:

            memory_ids = (
                await self
                .find_entity_memories(
                    [
                        entity_text
                    ],
                    user_id,
                )
            )

            related = (
                await self
                .find_related_concepts(
                    entity_text,
                    user_id,
                )
            )

            return {
                "entity":
                    entity_text,

                "related_entities":
                    related,

                "memory_count":
                    len(
                        memory_ids
                    ),

                "memory_ids":
                    memory_ids,
            }

        except Exception as exc:

            raise (
                RelationalInferenceError(
                    (
                        "Context build "
                        f"failed: {exc}"
                    )
                )
            ) from exc



    async def infer_relationships(
        self,
        query_entities: list[
            str
        ],
        user_id: UUID,
    ) -> list[
        dict
    ]:
        """
        Multi-entity graph
        inference entrypoint.
        """

        try:

            if not query_entities:
                return []

            contexts = []

            for entity in query_entities:

                context = (
                    await self
                    .get_entity_context(
                        entity,
                        user_id,
                    )
                )

                contexts.append(
                    context
                )

            logger.debug(
                (
                    "Generated "
                    f"{len(contexts)} "
                    "entity contexts"
                )
            )

            return contexts

        except Exception as exc:

            raise (
                RelationalInferenceError(
                    (
                        "Inference failed: "
                        f"{exc}"
                    )
                )
            ) from exc


__all__ = [
    "RelationalInference",
    "RelationalInferenceError",
]