"""
backend/workers/consolidation_worker.py

Background session consolidation worker.
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from backend.workers.celery_app import (
    celery_app,
)


logger = logging.getLogger(__name__)


@celery_app.task(
    name="workers.consolidation_worker.consolidate_session",
    bind=True,
    max_retries=2,
)
def consolidate_session(
    self,
    session_id: str,
    user_id: str,
) -> dict:
    """
    Executes consolidation once per completed session.

    Must never be called directly from API request path.
    """

    try:
        logger.info(
            "Consolidation task started for session %s",
            session_id,
        )

        from backend.core.long_term_memory.consolidation.pipeline import (
            ConsolidationPipeline,
        )

        pipeline = (
            ConsolidationPipeline()
        )

        result = asyncio.run(
            pipeline.run(
                UUID(
                    session_id
                ),
                UUID(
                    user_id
                ),
            )
        )

        facts_extracted = int(
            getattr(
                result,
                "facts_extracted",
                0,
            )
            if result
            else 0
        )

        return {
            "status": "ok",
            "session_id": session_id,
            "facts_extracted": facts_extracted,
        }

    except Exception as exc:
        logger.exception(
            "session_consolidation_failed",
            extra={
                "session_id": session_id,
                "user_id": user_id,
            },
        )

        try:
            raise self.retry(
                exc=exc,
                countdown=300,
            )

        except Exception:
            raise

@celery_app.task(
    name="workers.consolidation_worker.auto_consolidate_stale_sessions",
)
def auto_consolidate_stale_sessions() -> None:
    """Finds un-consolidated sessions older than 12 hours and triggers consolidation."""
    logger.info("Running auto-consolidation for stale sessions")

    from backend.db.postgres import AsyncSessionLocal
    from sqlalchemy import text

    async def _find_and_trigger():
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                text("""
                    SELECT id, user_id FROM sessions 
                    WHERE is_consolidated = FALSE 
                    AND started_at < NOW() - INTERVAL '12 hours'
                """)
            )
            rows = res.fetchall()
            for row in rows:
                logger.info("Auto-consolidating session %s", row.id)
                consolidate_session.delay(str(row.id), str(row.user_id))

    asyncio.run(_find_and_trigger())