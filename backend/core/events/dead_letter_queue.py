"""
backend/core/events/dead_letter_queue.py

Redis-backed Dead Letter Queue for failed event processing.

When a sync handler fails permanently (after retries), the failed event
is stored here with full context for debugging and replay.

Features:
- Persistent storage of failed events with error context
- TTL-based automatic cleanup (7 day default)
- Replay endpoint support
- Metrics for monitoring
"""

import json
import logging
import traceback
import time
from typing import Any

from backend.core.events.event_types import DomainEvent

logger = logging.getLogger(__name__)

# Redis keys
DLQ_KEY = "memora:events:dlq"
DLQ_METRICS_KEY = "memora:events:dlq:metrics"
DLQ_DEFAULT_TTL = 604800  # 7 days in seconds


class DeadLetterQueue:
    """
    Stores failed domain events for debugging and replay.

    Usage:
        dlq = DeadLetterQueue(redis_client)
        await dlq.store(event, handler_name="graph_sync", error=str(e), traceback=tb)
        failed_events = await dlq.list()
        await dlq.replay("some-event-id")
    """

    def __init__(self, redis_client) -> None:
        self.redis = redis_client

    async def store(
        self,
        event: DomainEvent,
        handler_name: str,
        error: str,
        tb: str = "",
        retry_count: int = 0,
    ) -> None:
        """
        Store a failed event in the dead-letter queue.

        Args:
            event: The domain event that failed
            handler_name: Which handler failed (e.g. "graph_sync", "intelligence_sync")
            error: Error message
            tb: Traceback string
            retry_count: Number of retries attempted before giving up
        """
        entry = {
            "event_id": event.event_id,
            "event_type": event.type.value,
            "user_id": event.user_id,
            "payload": event.payload,
            "handler": handler_name,
            "error": error,
            "traceback": tb,
            "retry_count": retry_count,
            "timestamp": time.time(),
            "stored_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        try:
            # Store in the DLQ list (FIFO, capped at 1000 entries)
            await self.redis.lpush(DLQ_KEY, json.dumps(entry))
            await self.redis.ltrim(DLQ_KEY, 0, 999)

            # Update metrics
            await self.redis.hincrby(DLQ_METRICS_KEY, handler_name, 1)
            await self.redis.hincrby(DLQ_METRICS_KEY, "total", 1)
            await self.redis.expire(DLQ_METRICS_KEY, DLQ_DEFAULT_TTL)

            logger.warning(
                "DLQ: Stored failed event %s from handler %s: %s",
                event.event_id, handler_name, error,
            )
        except Exception as e:
            logger.error("DLQ: Failed to store event %s: %s", event.event_id, e)

    async def list(self, limit: int = 50) -> list[dict[str, Any]]:
        """Return the most recent failed events."""
        try:
            raw = await self.redis.lrange(DLQ_KEY, 0, limit - 1)
            return [json.loads(item) for item in raw]
        except Exception as e:
            logger.error("DLQ: Failed to list events: %s", e)
            return []

    async def replay(self, event_id: str) -> bool:
        """
        Remove a specific event from the DLQ (mark as replayed/manually resolved).
        Returns True if found and removed.
        """
        try:
            raw = await self.redis.lrange(DLQ_KEY, 0, -1)
            for item in raw:
                entry = json.loads(item)
                if entry.get("event_id") == event_id:
                    await self.redis.lrem(DLQ_KEY, 1, item)
                    logger.info("DLQ: Replayed/removed event %s", event_id)
                    return True
            return False
        except Exception as e:
            logger.error("DLQ: Failed to replay event %s: %s", event_id, e)
            return False

    async def clear(self) -> int:
        """Clear all events from the dead-letter queue. Returns count."""
        try:
            count = await self.redis.llen(DLQ_KEY)
            await self.redis.delete(DLQ_KEY)
            await self.redis.delete(DLQ_METRICS_KEY)
            logger.info("DLQ: Cleared %d events", count)
            return count or 0
        except Exception as e:
            logger.error("DLQ: Failed to clear: %s", e)
            return 0

    async def get_metrics(self) -> dict[str, Any]:
        """Return DLQ metrics for monitoring."""
        try:
            metrics_raw = await self.redis.hgetall(DLQ_METRICS_KEY)
            total = await self.redis.llen(DLQ_KEY)
            return {
                "total_queued": total or 0,
                "by_handler": {k: int(v) for k, v in (metrics_raw or {}).items() if k != "total"},
                "total_failures": int(metrics_raw.get("total", 0)) if metrics_raw else 0,
            }
        except Exception as e:
            logger.error("DLQ: Failed to get metrics: %s", e)
            return {"total_queued": 0, "by_handler": {}, "total_failures": 0}


__all__ = ["DeadLetterQueue", "DLQ_KEY"]