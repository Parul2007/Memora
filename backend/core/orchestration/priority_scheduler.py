"""
backend/core/orchestration/priority_scheduler.py

Per-user ordered scheduling with async queues and locks.

Bounded queues prevent unbounded memory growth under load.
When a queue exceeds maxsize, the oldest pending message is dropped
(graceful degradation) rather than allowing memory to grow until OOM.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import (
    Awaitable,
    Callable,
)
from uuid import UUID

from backend.core.orchestration.state_machine import (
    TurnContext,
)


logger = logging.getLogger(__name__)

# Maximum pending messages per user before oldest is dropped
MAX_QUEUE_SIZE_PER_USER = 50

# Periodic cleanup interval (seconds) for stale empty queues
CLEANUP_INTERVAL_SECONDS = 300


class SchedulerError(Exception):
    """Raised for scheduler failures."""


class PriorityScheduler:
    _instance: PriorityScheduler | None = None

    def __new__(cls) -> PriorityScheduler:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._queues = {}
            cls._instance._locks = {}
        return cls._instance

    def _queue(self, user_id: UUID) -> asyncio.Queue[TurnContext]:
        if user_id not in self._queues:
            self._queues[user_id] = asyncio.Queue(maxsize=MAX_QUEUE_SIZE_PER_USER)
        return self._queues[user_id]

    def _lock(self, user_id: UUID) -> asyncio.Lock:
        if user_id not in self._locks:
            self._locks[user_id] = asyncio.Lock()
        return self._locks[user_id]

    async def enqueue(self, user_id: UUID, turn_context: TurnContext) -> None:
        try:
            queue = self._queue(user_id)

            # Non-blocking put with overflow strategy:
            # If queue is full, drop the oldest message to make room.
            # This prevents memory growth under load and ensures the
            # most recent message is always processed.
            try:
                queue.put_nowait(turn_context)
            except asyncio.QueueFull:
                logger.warning(
                    "Queue full for user %s (limit=%d). Dropping oldest message.",
                    user_id, MAX_QUEUE_SIZE_PER_USER,
                )
                try:
                    dropped = queue.get_nowait()
                    logger.info(
                        "Dropped message for user %s: session=%s",
                        user_id, getattr(dropped, "session_id", "unknown"),
                    )
                except asyncio.QueueEmpty:
                    pass
                queue.put_nowait(turn_context)

            logger.info(
                "Scheduler: user %s queue depth = %s",
                user_id,
                queue.qsize(),
            )

        except Exception as exc:
            raise SchedulerError("Failed to enqueue.") from exc

    async def dequeue(self, user_id: UUID) -> TurnContext:
        try:
            queue = self._queue(user_id)
            item = await queue.get()
            self._cleanup(user_id)

            logger.info(
                "Scheduler: user %s queue depth = %s",
                user_id,
                queue.qsize(),
            )

            return item

        except Exception as exc:
            raise SchedulerError("Failed to dequeue.") from exc

    async def process_with_lock(
        self,
        user_id: UUID,
        processor: Callable[[TurnContext], Awaitable[TurnContext]],
    ) -> TurnContext:
        lock = self._lock(user_id)

        async with lock:
            try:
                ctx = await self.dequeue(user_id)
                result = await processor(ctx)
                return result
            except Exception as exc:
                raise SchedulerError(f"Processing failed for {user_id}") from exc
            finally:
                self._cleanup(user_id)

    def _cleanup(self, user_id: UUID) -> None:
        """Remove queue and lock for a user if both are unused."""
        queue = self._queues.get(user_id)
        lock = self._locks.get(user_id)

        if queue and queue.empty() and (lock is None or not lock.locked()):
            self._queues.pop(user_id, None)
            self._locks.pop(user_id, None)

    def get_queue_depth(self, user_id: UUID) -> int:
        """Return the number of pending messages for a user."""
        queue = self._queues.get(user_id)
        if queue is None:
            return 0
        return queue.qsize()

    def get_metrics(self) -> dict:
        """Return scheduler metrics for monitoring."""
        return {
            "total_queues": len(self._queues),
            "total_locks": len(self._locks),
            "queues_by_depth": {
                str(uid): q.qsize()
                for uid, q in self._queues.items()
            },
            "max_queue_size_limit": MAX_QUEUE_SIZE_PER_USER,
        }