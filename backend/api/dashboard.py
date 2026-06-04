"""
backend/api/dashboard.py

Dashboard analytics API.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from uuid import UUID
from fastapi import (
    APIRouter,
    Depends,
)
from pydantic import BaseModel
from sqlalchemy import text

from backend.dependencies import (
    get_current_user,
)
from backend.db.postgres import (
    AsyncSessionLocal,
)
from backend.core.goal_planning.goal_tracker import (
    GoalTracker,
)
from backend.core.long_term_memory.stores.procedural_store import (
    ProceduralStore,
)
from backend.core.long_term_memory.stores.emotional_store import (
    EmotionalStore,
)
from backend.db.redis_client import (
    get_redis_client,
)
from backend.db.neo4j_client import (
    get_neo4j_driver,
)


router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"],
)

CACHE_TTL = 300


class DashboardSummary(
    BaseModel,
):
    total_memories: int
    memories_by_type: dict[
        str,
        int,
    ]
    active_goals: int
    completed_goals: int
    emotional_baseline: float
    top_habits: list[
        str
    ]
    memory_health_score: float


class EmotionalHistory(
    BaseModel,
):
    dates: list[
        str
    ]
    values: list[
        float
    ]


class MemoryActivity(
    BaseModel,
):
    dates: list[
        str
    ]
    counts: list[
        int
    ]


class MemoryHealthBreakdown(
    BaseModel,
):
    healthy: int
    fading: int
    decayed: int


goal_tracker = (
    GoalTracker()
)

procedural_store = (
    ProceduralStore()
)

emotional_store = (
    EmotionalStore()
)



async def _cached(
    key: str,
):
    rc = await get_redis_client()
    value = await rc.get(key)

    if value:
        return json.loads(
            value
        )

    return None


async def _store(
    key: str,
    data: dict,
):
    rc = await get_redis_client()
    await rc.set(
        key,
        json.dumps(
            data
        ),
        ex=CACHE_TTL,
    )


@router.get(
    "/summary",
    response_model=DashboardSummary,
)
async def summary(
    current_user: UUID = Depends(
        get_current_user
    ),
):
    cache_key = (
        f"dashboard:{current_user}:summary"
    )

    cached = (
        await _cached(
            cache_key
        )
    )

    if cached:
        return cached

    async with AsyncSessionLocal() as session:
        totals = await session.execute(
            text(
                """
                SELECT
                    memory_type,
                    COUNT(*)
                FROM memories
                WHERE user_id=:uid
                GROUP BY memory_type
                """
            ),
            {
                "uid": current_user
            },
        )

        health = await session.execute(
            text(
                """
                SELECT
                COALESCE(
                    AVG(
                        importance_score
                        *
                        decay_factor
                    ),
                    0
                )
                FROM memories
                WHERE user_id=:uid
                """
            ),
            {
                "uid": current_user
            },
        )

    memories = {
        row[0]: row[1]
        for row in totals
    }

    active = len(
        await goal_tracker.list_active(
            current_user
        )
    )

    completed = max(
        0,
        len(
            memories
        )
        - active,
    )

    habits = (
        await procedural_store.get_top_habits(
            current_user
        )
    )

    baseline = (
        await emotional_store.get_emotional_baseline(
            current_user
        )
    )

    payload = DashboardSummary(
        total_memories=sum(
            memories.values()
        ),
        memories_by_type=memories,
        active_goals=active,
        completed_goals=completed,
        emotional_baseline=baseline,
        top_habits=[
            h["name"]
            for h in habits[
                :5
            ]
        ],
        memory_health_score=float(
            health.scalar()
            or 0.0
        ),
    ).model_dump()

    await _store(
        cache_key,
        payload,
    )

    return payload


@router.get(
    "/emotional-history",
    response_model=EmotionalHistory,
)
async def emotional_history(
    current_user: UUID = Depends(
        get_current_user
    ),
):
    key = (
        f"dashboard:{current_user}:emotion"
    )

    cached = await _cached(
        key
    )

    if cached:
        return cached

    start = (
        datetime.now(
            timezone.utc
        )
        - timedelta(
            days=30
        )
    )

    async with AsyncSessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT
                        DATE(created_at),
                        AVG(emotional_weight)
                    FROM memories
                    WHERE user_id=:uid
                    AND created_at>=:start
                    GROUP BY DATE(created_at)
                    ORDER BY DATE(created_at)
                    """
                ),
                {
                    "uid": current_user,
                    "start": start,
                },
            )
        )

    data = rows.fetchall()

    result = EmotionalHistory(
        dates=[
            str(
                r[0]
            )
            for r in data
        ],
        values=[
            float(
                r[1]
            )
            for r in data
        ],
    ).model_dump()

    await _store(
        key,
        result,
    )

    return result


@router.get(
    "/memory-activity",
    response_model=MemoryActivity,
)
async def memory_activity(
    current_user: UUID = Depends(
        get_current_user
    ),
):
    key = (
        f"dashboard:{current_user}:activity"
    )

    cached = await _cached(
        key
    )

    if cached:
        return cached

    async with AsyncSessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT
                        DATE(created_at),
                        COUNT(*)
                    FROM memories
                    WHERE user_id=:uid
                    AND created_at >= NOW() - interval '30 day'
                    GROUP BY DATE(created_at)
                    ORDER BY DATE(created_at)
                    """
                ),
                {
                    "uid": current_user
                },
            )
        )

    data = rows.fetchall()

    result = MemoryActivity(
        dates=[
            str(
                x[0]
            )
            for x in data
        ],
        counts=[
            int(
                x[1]
            )
            for x in data
        ],
    ).model_dump()

    await _store(
        key,
        result,
    )

    return result


@router.get(
    "/top-entities",
)
async def top_entities(
    current_user: UUID = Depends(
        get_current_user
    ),
):
    key = (
        f"dashboard:{current_user}:entities"
    )

    cached = await _cached(
        key
    )

    if cached:
        return cached

    try:
        driver = await get_neo4j_driver()
        async with driver.session() as neo_session:
            result = await neo_session.run(
                """
                MATCH (e:Entity)-[:MENTIONED_IN]->(m:Memory {user_id: $uid})
                RETURN e.name AS name, e.type AS type, count(m) AS mentions
                ORDER BY mentions DESC LIMIT 20
                """,
                {"uid": str(current_user)},
            )
            records = await result.data()
        entities = [
            {"id": str(i), "name": r["name"], "type": r["type"], "mentions": r["mentions"]}
            for i, r in enumerate(records)
        ]
    except Exception:
        entities = []

    return entities



@router.get(
    "/memory-health-breakdown",
    response_model=MemoryHealthBreakdown,
)
async def memory_health_breakdown(
    current_user: UUID = Depends(
        get_current_user
    ),
):
    key = (
        f"dashboard:{current_user}:health_breakdown"
    )

    cached = await _cached(
        key
    )

    if cached:
        return cached

    async with AsyncSessionLocal() as session:
        # healthy > 0.8, fading 0.4 - 0.8, decayed < 0.4
        healthy = await session.execute(
            text("SELECT COUNT(*) FROM memories WHERE user_id=:uid AND decay_factor > 0.8"),
            {"uid": current_user}
        )
        fading = await session.execute(
            text("SELECT COUNT(*) FROM memories WHERE user_id=:uid AND decay_factor <= 0.8 AND decay_factor >= 0.4"),
            {"uid": current_user}
        )
        decayed = await session.execute(
            text("SELECT COUNT(*) FROM memories WHERE user_id=:uid AND decay_factor < 0.4"),
            {"uid": current_user}
        )

    result = MemoryHealthBreakdown(
        healthy=healthy.scalar() or 0,
        fading=fading.scalar() or 0,
        decayed=decayed.scalar() or 0,
    ).model_dump()

    await _store(
        key,
        result,
    )

    return result