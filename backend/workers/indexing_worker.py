"""
backend/workers/indexing_worker.py

Background memory ingestion worker.
"""

from __future__ import annotations

import asyncio
import logging

from backend.models.memory import (
    MemoryCreate,
)
from backend.workers.celery_app import (
    celery_app,
)


logger = logging.getLogger(__name__)


class IndexingWorkerError(Exception):
    """Raised for indexing failures."""


@celery_app.task(
    name="workers.indexing_worker.index_memory",
    bind=True,
    max_retries=3,
)
def index_memory(
    self,
    memory_create_json: str,
) -> dict:
    """
    Background memory ingestion task.

    Returns:
        {
            "status": "ok",
            "memory_id": str
        }

        OR

        {
            "status": "discarded"
        }
    """

    try:
        from backend.core.long_term_memory.ingestion.gateway import (
            MemoryIngestionGateway,
        )

        gateway = (
            MemoryIngestionGateway()
        )

        memory_create = (
            MemoryCreate.model_validate_json(
                memory_create_json
            )
        )

        logger.info(
            "Indexing memory for user %s: type=%s",
            memory_create.user_id,
            getattr(
                memory_create,
                "memory_type",
                "unknown",
            ),
        )

        memory = asyncio.run(
            gateway.ingest(
                memory_create
            )
        )

        if memory is None:
            return {
                "status": "discarded",
            }

        return {
            "status": "ok",
            "memory_id": str(
                memory.id
            ),
        }

    except Exception as exc:
        logger.exception(
            "memory_indexing_failed"
        )

        try:
            raise self.retry(
                exc=exc,
                countdown=60,
            )

        except Exception as retry_exc:
            raise IndexingWorkerError(
                "Memory indexing failed after retry scheduling."
            ) from retry_exc