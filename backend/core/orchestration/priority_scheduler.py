"""
backend/core/orchestration/priority_scheduler.py

Per-user ordered scheduling with async queues and locks.
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


class SchedulerError(Exception):
    """Raised for scheduler failures."""


class PriorityScheduler:
    _instance: (
        PriorityScheduler | None
    ) = None

    def __new__(
        cls,
    ) -> PriorityScheduler:
        if (
            cls._instance
            is None
        ):
            cls._instance = (
                super().__new__(
                    cls
                )
            )

            cls._instance._queues = (
                {}
            )

            cls._instance._locks = (
                {}
            )

        return cls._instance

    def _queue(
        self,
        user_id: UUID,
    ) -> asyncio.Queue[
        TurnContext
    ]:
        if (
            user_id
            not in self._queues
        ):
            self._queues[
                user_id
            ] = (
                asyncio.Queue()
            )

        return (
            self._queues[
                user_id
            ]
        )

    def _lock(
        self,
        user_id: UUID,
    ) -> asyncio.Lock:
        if (
            user_id
            not in self._locks
        ):
            self._locks[
                user_id
            ] = (
                asyncio.Lock()
            )

        return (
            self._locks[
                user_id
            ]
        )

    async def enqueue(
        self,
        user_id: UUID,
        turn_context: TurnContext,
    ) -> None:
        try:
            queue = self._queue(
                user_id
            )

            await queue.put(
                turn_context
            )

            logger.info(
                "Scheduler: user %s queue depth = %s",
                user_id,
                queue.qsize(),
            )

        except Exception as exc:
            raise SchedulerError(
                "Failed to enqueue."
            ) from exc

    async def dequeue(
        self,
        user_id: UUID,
    ) -> TurnContext:
        try:
            queue = self._queue(
                user_id
            )

            item = (
                await queue.get()
            )

            self._cleanup(
                user_id
            )

            logger.info(
                "Scheduler: user %s queue depth = %s",
                user_id,
                queue.qsize(),
            )

            return item

        except Exception as exc:
            raise SchedulerError(
                "Failed to dequeue."
            ) from exc

    async def process_with_lock(
        self,
        user_id: UUID,
        processor: Callable[
            [
                TurnContext
            ],
            Awaitable[
                TurnContext
            ],
        ],
    ) -> TurnContext:
        lock = self._lock(
            user_id
        )

        async with lock:
            try:
                ctx = (
                    await self.dequeue(
                        user_id
                    )
                )

                result = (
                    await processor(
                        ctx
                    )
                )

                return result

            except Exception as exc:
                raise SchedulerError(
                    (
                        "Processing failed "
                        f"for {user_id}"
                    )
                ) from exc

            finally:
                self._cleanup(
                    user_id
                )

    def _cleanup(
        self,
        user_id: UUID,
    ) -> None:
        queue = (
            self._queues.get(
                user_id
            )
        )

        lock = (
            self._locks.get(
                user_id
            )
        )

        if (
            queue
            and queue.empty()
            and (
                lock is None
                or not lock.locked()
            )
        ):
            self._queues.pop(
                user_id,
                None,
            )

            self._locks.pop(
                user_id,
                None,
            )