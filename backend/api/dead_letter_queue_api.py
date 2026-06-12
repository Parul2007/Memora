"""
backend/api/dead_letter_queue_api.py

Monitoring endpoint for the Redis-backed Dead Letter Queue.

Provides:
- GET /api/admin/dlq — List failed events
- POST /api/admin/dlq/replay — Remove a specific event from DLQ
- POST /api/admin/dlq/clear — Clear all events
- GET /api/admin/dlq/metrics — DLQ metrics
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID

from backend.dependencies import get_current_user
from backend.db.redis_client import get_redis_client
from backend.core.events.dead_letter_queue import DeadLetterQueue

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin/dlq",
    tags=["admin"],
)


class ReplayRequest(BaseModel):
    event_id: str


@router.get("/")
async def list_dlq(
    limit: int = 50,
    current_user: UUID = Depends(get_current_user),
):
    """List the most recent failed events from the dead-letter queue."""
    try:
        redis = await get_redis_client()
        dlq = DeadLetterQueue(redis)
        events = await dlq.list(limit=limit)
        metrics = await dlq.get_metrics()
        return {
            "events": events,
            "metrics": metrics,
            "count": len(events),
        }
    except Exception as e:
        logger.error("DLQ list failed: %s", e)
        return {"events": [], "metrics": {"total_queued": 0, "by_handler": {}, "total_failures": 0}, "count": 0}


@router.get("/metrics")
async def dlq_metrics(
    current_user: UUID = Depends(get_current_user),
):
    """Return DLQ metrics for monitoring."""
    try:
        redis = await get_redis_client()
        dlq = DeadLetterQueue(redis)
        return await dlq.get_metrics()
    except Exception as e:
        logger.error("DLQ metrics failed: %s", e)
        return {"total_queued": 0, "by_handler": {}, "total_failures": 0}


@router.post("/replay")
async def replay_event(
    req: ReplayRequest,
    current_user: UUID = Depends(get_current_user),
):
    """Remove a specific event from the dead-letter queue."""
    try:
        redis = await get_redis_client()
        dlq = DeadLetterQueue(redis)
        success = await dlq.replay(req.event_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Event {req.event_id} not found in DLQ")
        return {"status": "ok", "event_id": req.event_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear")
async def clear_dlq(
    current_user: UUID = Depends(get_current_user),
):
    """Clear all events from the dead-letter queue."""
    try:
        redis = await get_redis_client()
        dlq = DeadLetterQueue(redis)
        count = await dlq.clear()
        return {"status": "ok", "cleared": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))