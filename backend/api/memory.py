"""
backend/api/memory.py

Memory management API.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)

from backend.dependencies import (
    get_current_user,
)
from backend.models.memory import (
    Memory,
    MemorySearchQuery,
    MemorySearchResult,
    MemoryType,
    MemoryUpdate,
)
from backend.core.perception.embedder import (
    embed_text,
)
from backend.core.retrieval_engine.reranker import (
    rerank,
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
from backend.db.postgres import AsyncSessionLocal
from sqlalchemy import text
from backend.core.events.event_publisher import EventPublishError, publish_event
from backend.core.events.event_types import DomainEvent, EventType


router = APIRouter(
    prefix="/api/memory",
    tags=["memory"],
)


class MemoryAPIError(
    Exception
):
    pass


stores = {
    MemoryType.EPISODIC: (
        EpisodicStore(session_factory=AsyncSessionLocal)
    ),
    MemoryType.SEMANTIC: (
        SemanticStore(session_factory=AsyncSessionLocal)
    ),
    MemoryType.PROCEDURAL: (
        ProceduralStore(session_factory=AsyncSessionLocal)
    ),
    MemoryType.EMOTIONAL: (
        EmotionalStore(session_factory=AsyncSessionLocal)
    ),
}


def _hydrate_memory_row(row) -> Memory:
    data = dict(row._mapping)

    if isinstance(data.get("embedding"), str):
        try:
            data["embedding"] = json.loads(data["embedding"])
        except Exception:
            pass

    return Memory.model_validate(data)


async def _publish_memory_event_or_raise(event_type: EventType, memory: Memory) -> None:
    try:
        await publish_event(DomainEvent(
            type=event_type,
            user_id=str(memory.user_id),
            payload={"memory": memory.model_dump(mode="json")},
        ))
    except EventPublishError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "memory_sync_publish_failed",
                "message": str(exc),
                "memory_id": str(memory.id),
            },
        ) from exc


async def _update_memory_record(
    memory_id: UUID,
    user_id: UUID,
    update: MemoryUpdate,
) -> Memory:
    payload = {
        "content": None,
        "importance_score": None,
        "emotional_weight": None,
        "decay_factor": None,
        "is_consolidated": None,
        "entities": None,
        "metadata": None,
    }
    payload.update(update.model_dump(exclude_none=True, mode="json"))
    payload["memory_id"] = memory_id
    payload["user_id"] = user_id
    payload["entities"] = json.dumps(payload["entities"]) if payload["entities"] is not None else None
    payload["metadata"] = json.dumps(payload["metadata"]) if payload["metadata"] is not None else None

    query = text(
        """
        UPDATE memories
        SET
            content = COALESCE(:content, content),
            importance_score = COALESCE(:importance_score, importance_score),
            emotional_weight = COALESCE(:emotional_weight, emotional_weight),
            decay_factor = COALESCE(:decay_factor, decay_factor),
            is_consolidated = COALESCE(:is_consolidated, is_consolidated),
            entities = COALESCE(CAST(:entities AS jsonb), entities),
            metadata = COALESCE(CAST(:metadata AS jsonb), metadata),
            updated_at = timezone('utc'::text, now())
        WHERE id = :memory_id AND user_id = :user_id
        RETURNING *
        """
    )

    async with AsyncSessionLocal() as session:
        result = await session.execute(query, payload)
        await session.commit()
        row = result.first()

    if row is None:
        raise HTTPException(status_code=404, detail="Memory not found")

    return _hydrate_memory_row(row)


async def _soft_delete_memory_record(
    memory_id: UUID,
    user_id: UUID,
) -> Memory:
    query = text(
        """
        UPDATE memories
        SET
            expires_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = :memory_id AND user_id = :user_id
        RETURNING *
        """
    )

    async with AsyncSessionLocal() as session:
        result = await session.execute(query, {"memory_id": memory_id, "user_id": user_id})
        await session.commit()
        row = result.first()

    if row is None:
        raise HTTPException(status_code=404, detail="Memory not found")

    return _hydrate_memory_row(row)


async def _find_memory(
    memory_id: UUID,
    user_id: UUID,
) -> (
    tuple[
        Memory,
        object,
    ]
):
    for store in (
        stores.values()
    ):
        memory = await store.get(
            memory_id=memory_id,
            user_id=user_id,
        )

        if memory:
            return (
                memory,
                store,
            )

    raise HTTPException(
        status_code=404,
        detail="Memory not found",
    )


@router.get(
    "/",
    response_model=list[
        Memory
    ],
)
async def list_memories(
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    current_user: UUID = Depends(
        get_current_user
    ),
):
    results = []

    for store in (
        stores.values()
    ):
        try:
            memories = (
                await store.list_recent(
                    user_id=current_user,
                    limit=limit,
                    offset=offset,
                )
            )

            results.extend(
                memories
            )

        except Exception:
            continue

    results.sort(
        key=lambda m: getattr(
            m,
            "created_at",
            datetime.min.replace(
                tzinfo=timezone.utc
            ),
        ),
        reverse=True,
    )

    return results[
        :limit
    ]


@router.get(
    "/session/{session_id}",
    response_model=list[Memory],
)
async def list_session_memories(
    session_id: str,
    current_user: UUID = Depends(get_current_user),
):
    results = []

    for store_type in [MemoryType.SEMANTIC, MemoryType.EMOTIONAL]:
        store = stores[store_type]
        try:
            memories = await store.get_by_session(
                user_id=current_user,
                session_id=session_id
            )
            
            # Additional filter just to ensure it's an extracted_live memory
            for mem in memories:
                if mem.metadata and mem.metadata.get("extracted_live"):
                    results.append(mem)

        except Exception as e:
            continue

    results.sort(
        key=lambda m: getattr(
            m,
            "created_at",
            datetime.min.replace(tzinfo=timezone.utc),
        ),
        reverse=True,
    )

    return results


@router.get(
    "/stats",
)
async def memory_stats(
    current_user: UUID = Depends(
        get_current_user
    ),
):
    stats = {}

    total = 0

    for (
        memory_type,
        store,
    ) in stores.items():
        try:
            count = await store.count(
                current_user
            )

        except Exception:
            count = 0

        stats[
            memory_type.value
        ] = count

        total += count

    stats[
        "total"
    ] = total

    return stats
from backend.models.memory import MemoryCreate
from pydantic import BaseModel

@router.get('/emotional-timeline')
async def get_emotional_timeline(
    days: int = Query(default=30),
    current_user: UUID = Depends(get_current_user),
):
    try:
        from backend.db.postgres import AsyncSessionLocal
        from sqlalchemy import text
        
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                text('''
                    SELECT 
                        DATE(created_at) as date, 
                        AVG(emotional_weight) as avg_weight
                    FROM memories
                    WHERE user_id = :uid AND memory_type = 'emotional'
                    AND created_at >= NOW() - INTERVAL '1 day' * :days
                    GROUP BY DATE(created_at)
                    ORDER BY date ASC
                '''),
                {'uid': current_user, 'days': days}
            )
            rows = res.fetchall()
            return [{'date': str(r.date), 'baseline': r.avg_weight} for r in rows]
    except Exception as e:
        return []

class IntelligenceResponse(BaseModel):
    metrics: dict
    memory_health: dict
    topics: list[dict]
    entities: list[dict]
    trends: dict

@router.get("/intelligence", response_model=IntelligenceResponse)
async def get_memory_intelligence(
    current_user: UUID = Depends(get_current_user),
):
    try:
        from backend.db.postgres import AsyncSessionLocal
        from sqlalchemy import text
        
        async with AsyncSessionLocal() as db:
            res_metrics = await db.execute(
                text('''
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent,
                        COUNT(*) FILTER (WHERE expires_at IS NOT NULL) as archived
                    FROM memories
                    WHERE user_id = :uid
                '''),
                {'uid': current_user}
            )
            metrics_row = res_metrics.fetchone()

            res_health = await db.execute(
                text('''
                    SELECT 
                        COUNT(*) FILTER (WHERE decay_factor >= 0.8) as healthy,
                        COUNT(*) FILTER (WHERE decay_factor < 0.8 AND decay_factor >= 0.4) as aging,
                        COUNT(*) FILTER (WHERE importance_score < 0.2 AND access_count = 0) as orphaned
                    FROM memories
                    WHERE user_id = :uid AND expires_at IS NULL
                '''),
                {'uid': current_user}
            )
            health_row = res_health.fetchone()

            res_topics = await db.execute(
                text('''
                    SELECT entity, COUNT(*) as mentions
                    FROM memories, jsonb_array_elements_text(entities) as entity
                    WHERE user_id = :uid AND expires_at IS NULL
                    GROUP BY entity
                    ORDER BY mentions DESC
                    LIMIT 5
                '''),
                {'uid': current_user}
            )
            topics_data = res_topics.fetchall()
            
            topics = [{'name': r.entity, 'mentions': r.mentions, 'growth': max(1, r.mentions * 2)} for r in topics_data]
            entities = [{'id': f"entity-{i}", 'name': r.entity, 'mentions': r.mentions, 'connections': max(0, r.mentions - 1)} for i, r in enumerate(topics_data)]

            return IntelligenceResponse(
                metrics={
                    "total_memories": metrics_row.total if metrics_row else 0,
                    "recent_memories": metrics_row.recent if metrics_row else 0,
                    "archived_memories": metrics_row.archived if metrics_row else 0
                },
                memory_health={
                    "healthy": health_row.healthy if health_row else 0,
                    "aging": health_row.aging if health_row else 0,
                    "conflicting": 0,
                    "orphaned": health_row.orphaned if health_row else 0
                },
                topics=topics,
                entities=entities,
                trends={
                    "fastest_growing_topic": topics[0]['name'] if topics else "None",
                    "strongest_entity": entities[0]['name'] if entities else "None"
                }
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Intelligence aggregation failed")
        return IntelligenceResponse(
            metrics={"total_memories": 0, "recent_memories": 0, "archived_memories": 0},
            memory_health={"healthy": 0, "aging": 0, "conflicting": 0, "orphaned": 0},
            topics=[],
            entities=[],
            trends={"fastest_growing_topic": "None", "strongest_entity": "None"}
        )

class CreateMemoryRequest(BaseModel):
    content: str
    memory_type: str

@router.post('/')
async def create_memory(
    req: CreateMemoryRequest,
    current_user: UUID = Depends(get_current_user),
):
    mem_type = MemoryType(req.memory_type)
    store = stores[mem_type]
    embedding = await embed_text(req.content)
    
    new_mem = MemoryCreate(
        user_id=current_user,
        content=req.content,
        memory_type=mem_type,
        importance_score=0.9,
        emotional_weight=0.0,
        embedding=embedding,
    )
    

    created = await store.save(new_mem)
    await _publish_memory_event_or_raise(EventType.MemoryCreated, created)
    return created


@router.get(
    "/{memory_id}",
    response_model=Memory,
)
async def get_memory(
    memory_id: UUID,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    memory, _ = (
        await _find_memory(
            memory_id,
            current_user,
        )
    )

    if (
        memory.user_id
        != current_user
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    return memory

@router.patch(
    "/{memory_id}",
    response_model=Memory,
)
async def update_memory(
    memory_id: UUID,
    update: MemoryUpdate,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    memory, _store = await _find_memory(
        memory_id,
        current_user,
    )

    if memory.user_id != current_user:
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    updated = await _update_memory_record(
        memory_id=memory_id,
        user_id=current_user,
        update=update,
    )
    await _publish_memory_event_or_raise(EventType.MemoryUpdated, updated)
    return updated


@router.delete(
    "/{memory_id}",
)
async def delete_memory(
    memory_id: UUID,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    memory, _store = await _find_memory(
        memory_id,
        current_user,
    )

    if memory.user_id != current_user:
        raise HTTPException(
            status_code=403,
            detail="Forbidden",
        )

    deleted = await _soft_delete_memory_record(
        memory_id=memory_id,
        user_id=current_user,
    )
    await _publish_memory_event_or_raise(EventType.MemoryDeleted, deleted)

    return {
        "status": "deleted"
    }
