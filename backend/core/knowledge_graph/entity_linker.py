# core/knowledge_graph/entity_linker.py
# Converts extracted perception entities into Neo4j graph structures.
# Creates entity nodes, memory links, and entity-to-entity relationships.

from __future__ import annotations

import itertools
import logging
from typing import Any
from uuid import UUID

from backend.models.memory import (
    Memory,
)

from backend.core.knowledge_graph.graph_client import (
    GraphClient,
)


logger = logging.getLogger(__name__)

MIN_ENTITY_SCORE = 0.4


class EntityLinkerError(Exception):
    """Raised for graph entity linking failures."""


class EntityLinker:

    def __init__(
        self,
        graph_client: GraphClient,
    ) -> None:

        self.graph = (
            graph_client
        )



    async def link_memory_entities(
        self,
        memory: Memory,
        entities: list[
            dict[
                str,
                Any,
            ]
        ],
    ) -> None:
        """
        Create entity nodes,
        memory node,
        and connect them.
        """

        try:

            await (
                self.graph
                .create_memory_node(
                    memory
                )
            )

            valid = [
                entity
                for entity
                in entities
                if (
                    float(
                        entity.get(
                            "score",
                            0.0,
                        )
                    )
                    >=
                    MIN_ENTITY_SCORE
                )
            ]

            for entity in valid:

                text = str(
                    entity[
                        "text"
                    ]
                )

                label = str(
                    entity[
                        "label"
                    ]
                )

                await (
                    self.graph
                    .create_entity_node(
                        entity_text=text,
                        entity_label=label,
                        user_id=(
                            memory
                            .user_id
                        ),
                    )
                )

                await (
                    self.graph
                    .link_entity_to_memory(
                        entity_text=text,
                        memory_id=(
                            memory.id
                        ),
                        user_id=(
                            memory
                            .user_id
                        ),
                    )
                )

            logger.debug(
                (
                    "Linked "
                    f"{len(valid)} "
                    "entities to "
                    f"{memory.id}"
                )
            )

        except Exception as exc:

            raise (
                EntityLinkerError(
                    (
                        "Entity linking "
                        f"failed: {exc}"
                    )
                )
            ) from exc



    async def link_related_entities(
        self,
        entities: list[
            dict[
                str,
                Any,
            ]
        ],
        user_id: UUID,
    ) -> None:
        """
        Create RELATED_TO
        relationships for
        co-occurring entities.
        """

        try:

            filtered = [
                entity
                for entity
                in entities
                if (
                    float(
                        entity.get(
                            "score",
                            0.0,
                        )
                    )
                    >=
                    MIN_ENTITY_SCORE
                )
            ]

            if (
                len(filtered)
                < 2
            ):
                return

            for left, right in (
                itertools
                .combinations(
                    filtered,
                    2,
                )
            ):

                cypher = """
                MATCH (
                    e1:Entity {
                        text: $left,
                        user_id: $uid
                    }
                )
                MATCH (
                    e2:Entity {
                        text: $right,
                        user_id: $uid
                    }
                )

                MERGE
                (
                    e1
                )
                -
                [
                    :RELATED_TO
                ]
                -
                (
                    e2
                )
                """

                await (
                    self.graph
                    .run_query(
                        cypher,
                        {
                            "left":
                                left[
                                    "text"
                                ],

                            "right":
                                right[
                                    "text"
                                ],

                            "uid":
                                str(
                                    user_id
                                ),
                        },
                    )
                )

            logger.debug(
                (
                    "Linked "
                    f"{len(filtered)} "
                    "related entities"
                )
            )

        except Exception as exc:

            raise (
                EntityLinkerError(
                    (
                        "Entity relation "
                        f"failed: {exc}"
                    )
                )
            ) from exc



    async def process(
        self,
        memory: Memory,
        entities: list[
            dict[
                str,
                Any,
            ]
        ],
    ) -> None:
        """
        Public entrypoint
        for ingestion gateway.
        """

        try:

            if not entities:
                return

            await (
                self.link_memory_entities(
                    memory,
                    entities,
                )
            )

            await (
                self.link_related_entities(
                    entities,
                    memory.user_id,
                )
            )

            logger.debug(
                (
                    "Entity graph "
                    "processing complete "
                    f"{memory.id}"
                )
            )

        except Exception as exc:

            raise (
                EntityLinkerError(
                    (
                        "Processing failed: "
                        f"{exc}"
                    )
                )
            ) from exc


__all__ = [
    "EntityLinker",
    "EntityLinkerError",
]