"""
backend/api/memory.py

Memory management API.
"""

from __future__ import annotations

from datetime import datetime, timezone
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
        from backend.db.postgres import get_async_session
        from sqlalchemy import text
        
        async for db in get_async_session():
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
    
    return await store.save(new_mem)


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


class SearchRequest(
    MemorySearchQuery,
):
    top_k: int = 8


@router.post(
    "/search",
    response_model=list[
        MemorySearchResult
    ],
)
async def search_memories(
    body: SearchRequest,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    embedding = (
        await embed_text(
            body.query
        )
    )

    search_query = (
        MemorySearchQuery(
            user_id=current_user,
            query=body.query,
            embedding=embedding,
        )
    )

    candidates = []

    types = (
        body.memory_types
        or list(
            stores.keys()
        )
    )

    for memory_type in (
        types
    ):
        store = (
            stores[
                memory_type
            ]
        )

        try:
            candidates.extend(
                await store.search_by_vector(
                    search_query
                )
            )

        except Exception:
            continue

    return await rerank(
        body.query,
        candidates,
        body.top_k,
    )


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
    memory, store = (
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

    return await store.update(
        memory_id=memory_id,
        user_id=current_user,
        update=update,
    )


@router.delete(
    "/{memory_id}",
)
async def delete_memory(
    memory_id: UUID,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    memory, store = (
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

    await store.update(
        memory_id=memory_id,
        user_id=current_user,
        update=MemoryUpdate(
            expires_at=datetime.now(
                timezone.utc
            )
        ),
    )

    return {
        "status": "deleted"
    }