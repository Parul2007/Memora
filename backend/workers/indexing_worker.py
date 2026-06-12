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


async def _async_index_memory(memory_create_json: str | dict) -> dict:
    from backend.core.long_term_memory.ingestion.gateway import (
        MemoryIngestionGateway,
        IngestionGatewayError,
        task_session_var,
    )
    import json
    from uuid import UUID
    from pydantic import ValidationError

    # ------------------------------------------------------------------ #
    # IMPORTANT: create a fresh engine + session inside this coroutine.   #
    # The module-level AsyncSessionLocal / engine is bound to the main    #
    # process event loop. Celery uses asyncio.run() which starts a NEW    #
    # loop — reusing the old pool causes asyncpg's                        #
    # "another operation is in progress" InterfaceError.                  #
    #                                                                     #
    # Instead of monkey-patching the global AsyncSessionLocal (which      #
    # causes race conditions with concurrent Celery workers), we set a    #
    # per-task context variable. The gateway reads it and uses it only    #
    # for this specific task.                                             #
    # ------------------------------------------------------------------ #
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from backend.config import settings

    _task_engine = create_async_engine(
        settings.postgres_url,
        pool_size=2,
        max_overflow=2,
        pool_timeout=30,
        echo=False,
    )
    _task_session = async_sessionmaker(
        bind=_task_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Set the per-task session factory via contextvar instead of
    # monkey-patching the global. This is safe with concurrent workers.
    task_session_var.set(_task_session)

    gateway = MemoryIngestionGateway()

    try:
        payload = None
        if isinstance(memory_create_json, str):
            try:
                payload = json.loads(memory_create_json)
            except json.JSONDecodeError as e:
                logger.error(f"Malformed JSON payload string: {e}")
                return {"status": "malformed", "message": f"Invalid JSON string: {e}"}
        elif isinstance(memory_create_json, dict):
            payload = memory_create_json
        else:
            logger.error(f"Invalid payload format, expected dict or JSON str: {type(memory_create_json)}")
            return {"status": "malformed", "message": f"Invalid payload type: {type(memory_create_json)}"}

        try:
            if "embedding" in payload and "memory_type" in payload:
                # Fully populated payload
                memory_create = MemoryCreate.model_validate(payload)
            else:
                # Raw text payload — requires background perception parse
                required_fields = ["user_id", "content"]
                missing = [f for f in required_fields if f not in payload]
                if missing:
                    logger.error(f"Malformed raw indexing payload, missing fields: {missing}")
                    return {"status": "malformed", "message": f"Missing raw fields: {missing}"}

                from backend.core.perception.parser import parse
                session_id = payload.get("session_id") or payload.get("source_session_id")
                if session_id:
                    session_uuid = UUID(str(session_id))
                else:
                    session_uuid = UUID("00000000-0000-0000-0000-000000000000")

                logger.info(
                    "Running background perception parse for content from user %s...",
                    payload["user_id"]
                )
                perception = await parse(
                    text=payload["content"],
                    session_id=session_uuid,
                    user_id=UUID(str(payload["user_id"])),
                )

                memory_create = MemoryCreate(
                    user_id=UUID(str(payload["user_id"])),
                    content=payload["content"],
                    memory_type=perception.memory_type,
                    embedding=perception.embedding,
                    entities=[e.get("text", "") for e in perception.entities] if perception.entities else [],
                    source_session_id=session_uuid,
                    metadata={
                        "background_indexed": True,
                        "session_id": str(session_uuid)
                    }
                )
        except (ValidationError, ValueError, KeyError) as val_err:
            logger.error(f"Payload validation failed: {val_err}", exc_info=True)
            return {"status": "malformed", "message": str(val_err)}

        logger.info(
            "Indexing memory for user %s: type=%s",
            memory_create.user_id,
            getattr(memory_create, "memory_type", "unknown"),
        )

        memory = await gateway.ingest(memory_create)

        if memory is None:
            logger.info("Memory discarded (below threshold or duplicate) — not an error.")
            return {"status": "discarded"}

        return {
            "status": "ok",
            "memory_id": str(memory.id),
        }

    finally:
        await _task_engine.dispose()


@celery_app.task(
    name="workers.indexing_worker.index_memory",
    max_retries=3,
    retry_kwargs={"countdown": 60},
)
def index_memory(
    memory_create_json: str | dict,
) -> dict:
    """
    Background memory ingestion task.
    Creates a fresh DB engine per invocation to avoid asyncpg event-loop
    cross-contamination when called from Celery's asyncio.run() context.
    """
    try:
        return asyncio.run(_async_index_memory(memory_create_json))
    except Exception as exc:
        logger.exception("index_memory task failed: %s", exc)
        raise index_memory.retry(exc=exc, countdown=60)