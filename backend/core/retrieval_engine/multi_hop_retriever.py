"""
backend/core/retrieval_engine/multi_hop_retriever.py

Parallel retrieval across warm stores, cold archive, and knowledge graph.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Iterable
from uuid import UUID

from backend.config import settings
from backend.db.qdrant_client import (
    qdrant, Filter, FieldCondition, MatchValue
)
from backend.models.memory import (
    Memory,
    MemorySearchQuery,
    MemoryType,
)
from backend.core.retrieval_engine.query_analyzer import (
    QueryAnalysis,
)
from backend.core.long_term_memory.stores.episodic_store import (
    EpisodicStore,
)
from backend.core.long_term_memory.stores.semantic_store import (
    SemanticStore,
)
from backend.core.long_term_memory.stores.procedural_store import (
    ProceduralStore,
)
from backend.core.long_term_memory.stores.emotional_store import (
    EmotionalStore,
)
from backend.core.knowledge_graph.relational_inference import (
    RelationalInference,
)
from backend.core.knowledge_graph.graph_client import GraphClient
from backend.db.neo4j_client import get_neo4j_driver


logger = logging.getLogger(__name__)


class MultiHopRetrieverError(Exception):
    """Raised when retrieval fails."""


class MultiHopRetriever:
    def __init__(self) -> None:
        self._stores = {
            MemoryType.EPISODIC: EpisodicStore(),
            MemoryType.SEMANTIC: SemanticStore(),
            MemoryType.PROCEDURAL: ProceduralStore(),
            MemoryType.EMOTIONAL: EmotionalStore(),
        }

    async def retrieve(
        self,
        query: MemorySearchQuery,
        query_analysis: QueryAnalysis,
    ) -> list[Memory]:
        try:
            warm_task = self._search_warm_stores(
                query,
                query_analysis.search_memory_types,
            )

            cold_task = self._search_cold_store(
                query,
            )

            graph_task = self._graph_lookup(
                query_analysis.key_entities,
                query.user_id,
            )

            warm, cold, graph = await asyncio.gather(
                warm_task,
                cold_task,
                graph_task,
                return_exceptions=False,
            )

            merged = self._deduplicate(
                [
                    *warm,
                    *cold,
                    *graph,
                ]
            )

            if query_analysis.requires_multi_hop:
                hop = await self._multi_hop(
                    query,
                    merged,
                )

                merged = self._deduplicate(
                    [
                        *merged,
                        *hop,
                    ]
                )

            ranked = sorted(
                merged,
                key=lambda m: float(
                    getattr(
                        m,
                        "importance_score",
                        0.0,
                    )
                ),
                reverse=True,
            )[
                :settings.max_retrieval_candidates
            ]

            logger.info(
                "Retrieved %s warm, %s cold, %s graph candidates → %s after dedup",
                len(warm),
                len(cold),
                len(graph),
                len(ranked),
            )

            return ranked

        except Exception as exc:
            logger.exception(
                "multi_hop_retrieval_failed"
            )

            raise MultiHopRetrieverError(
                "Retrieval failed."
            ) from exc

    async def _search_warm_stores(
        self,
        query: MemorySearchQuery,
        memory_types: list[MemoryType],
    ) -> list[Memory]:
        tasks = []

        for memory_type in memory_types:
            store = self._stores.get(
                memory_type
            )

            if store:
                kwargs = {
                    "query_embedding": query.query_embedding,
                    "user_id": query.user_id,
                    "top_k": query.top_k,
                }
                if memory_type == MemoryType.EPISODIC:
                    kwargs["min_importance"] = query.min_importance

                tasks.append(
                    store.search_by_vector(**kwargs)
                )

        if not tasks:
            return []

        results = await asyncio.gather(
            *tasks,
            return_exceptions=True,
        )

        memories = []

        for result in results:
            if (
                isinstance(
                    result,
                    Exception,
                )
                or not result
            ):
                continue

            memories.extend(result)

        return memories

    async def _search_cold_store(
        self,
        query: MemorySearchQuery,
    ) -> list[Memory]:
        try:
            points = await qdrant.search(
                collection_name="memories",
                query_vector=query.query_embedding,
                limit=10,
                query_filter=Filter(
                    must=[
                        FieldCondition(
                            key="user_id",
                            match=MatchValue(value=str(query.user_id)),
                        )
                    ]
                ) if query.user_id else None
            )
            
            memories = []
            for point in points:
                if point.payload:
                    # Construct memory object from payload
                    from backend.models.memory import Memory, MemoryType
                    try:
                        memory = Memory(
                            id=point.id,
                            user_id=query.user_id,
                            content=point.payload.get("content", ""),
                            memory_type=MemoryType(point.payload.get("memory_type", "semantic")),
                            entities=point.payload.get("entities", []),
                            importance_score=point.payload.get("importance_score", 0.0),
                            metadata=point.payload.get("metadata", {})
                        )
                        memories.append(memory)
                    except Exception:
                        continue
                        
            return memories

        except Exception:
            logger.debug(
                "cold_search_failed",
                exc_info=True,
            )
            return []

    async def _graph_lookup(
        self,
        entities: list[str],
        user_id: UUID,
    ) -> list[Memory]:
        try:
            if not entities:
                return []

            driver = await get_neo4j_driver()
            graph_client = GraphClient(driver)
            relational_inference = RelationalInference(graph_client)

            memory_ids = (
                await relational_inference.find_entity_memories(
                    entities=entities,
                    user_id=user_id,
                )
            )

            found = []

            for memory_id in memory_ids:
                for store in (
                    self._stores.values()
                ):
                    try:
                        memory = (
                            await store.get(
                                memory_id=memory_id,
                                user_id=user_id,
                            )
                        )

                        if memory:
                            found.append(
                                memory
                            )
                            break

                    except Exception:
                        continue

            return found

        except Exception:
            logger.debug(
                "graph_lookup_failed",
                exc_info=True,
            )

            return []

    async def _multi_hop(
        self,
        query: MemorySearchQuery,
        memories: list[Memory],
    ) -> list[Memory]:
        entities = set()

        for memory in memories:
            memory_entities = getattr(
                memory,
                "entities",
                [],
            )

            for entity in (
                memory_entities
            ):
                entities.add(
                    str(entity)
                )

        if not entities:
            return []

        return await self._graph_lookup(
            list(entities),
            query.user_id,
        )

    @staticmethod
    def _deduplicate(
        memories: Iterable[Memory],
    ) -> list[Memory]:
        seen: set[UUID] = set()

        deduped = []

        for memory in memories:
            memory_id = getattr(
                memory,
                "id",
                None,
            )

            if (
                not memory_id
                or memory_id
                in seen
            ):
                continue

            seen.add(
                memory_id
            )

            deduped.append(
                memory
            )

        return deduped