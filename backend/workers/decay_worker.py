"""
backend/workers/decay_worker.py

Periodic Celery tasks for memory decay and retention.
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import text

from backend.db.postgres import AsyncSessionLocal
from backend.workers.celery_app import (
    celery_app,
)
from backend.core.long_term_memory.lifecycle.decay_engine import (
    DecayEngine,
)
from backend.core.long_term_memory.lifecycle.retention_engine import (
    RetentionEngine,
)


logger = logging.getLogger(__name__)


async def _fetch_user_ids() -> list[str]:
    query = text(
        """
        SELECT DISTINCT user_id
        FROM memories
        WHERE user_id IS NOT NULL
        """
    )

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            query
        )

        rows = (
            result.fetchall()
        )

    return [
        str(
            row[0]
        )
        for row in rows
    ]


async def _run_decay() -> dict:
    engine = (
        DecayEngine()
    )

    user_ids = (
        await _fetch_user_ids()
    )

    users_processed = 0
    memories_decayed = 0

    for user_id in user_ids:
        try:
            result = (
                await engine.run(
                    user_id=user_id
                )
            )

            users_processed += 1

            memories_decayed += int(
                getattr(
                    result,
                    "decayed_count",
                    0,
                )
                if result
                else 0
            )

            logger.info(
                "decay_complete user=%s count=%s",
                user_id,
                getattr(
                    result,
                    "decayed_count",
                    0,
                ),
            )

        except Exception:
            logger.exception(
                "decay_failed user=%s",
                user_id,
            )

    logger.info(
        "Decay pass complete: %s users, %s memories decayed",
        users_processed,
        memories_decayed,
    )

    return {
        "users": users_processed,
        "memories_decayed": memories_decayed,
    }


async def _run_retention() -> dict:
    engine = (
        RetentionEngine()
    )

    user_ids = (
        await _fetch_user_ids()
    )

    users_processed = 0
    retained = 0

    for user_id in user_ids:
        try:
            result = (
                await engine.run(
                    user_id=user_id
                )
            )

            users_processed += 1

            retained += int(
                getattr(
                    result,
                    "retained_count",
                    0,
                )
                if result
                else 0
            )

            logger.info(
                "retention_complete user=%s count=%s",
                user_id,
                getattr(
                    result,
                    "retained_count",
                    0,
                ),
            )

        except Exception:
            logger.exception(
                "retention_failed user=%s",
                user_id,
            )

    logger.info(
        "Retention pass complete: %s users, %s memories retained",
        users_processed,
        retained,
    )

    return {
        "users": users_processed,
        "retained": retained,
    }


@celery_app.task(
    name="workers.decay_worker.run_decay",
)
def run_decay() -> dict:
    return asyncio.run(
        _run_decay()
    )


@celery_app.task(
    name="workers.decay_worker.run_retention",
)
def run_retention() -> dict:
    return asyncio.run(
        _run_retention()
    )