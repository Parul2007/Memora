"""
backend/workers/celery_app.py

Celery application configuration for Memora.
"""

from __future__ import annotations

import logging

from celery import Celery

from backend.config import settings


logger = logging.getLogger(__name__)


celery_app = Celery(
    "memora",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "backend.workers.indexing_worker",
        "backend.workers.consolidation_worker",
        "backend.workers.decay_worker",
    ],
)


celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,

    task_routes={
        "workers.indexing_worker.*": {
            "queue": "indexing",
        },
        "workers.consolidation_worker.*": {
            "queue": "consolidation",
        },
        "workers.decay_worker.*": {
            "queue": "maintenance",
        },
    },
    beat_schedule={
        "decay-pass": {
            "task": (
                "workers.decay_worker.run_decay"
            ),
            "schedule": (
                6 * 60 * 60
            ),
        },
        "retention-pass": {
            "task": (
                "workers.decay_worker.run_retention"
            ),
            "schedule": (
                24 * 60 * 60
            ),
        },
        "auto-consolidate": {
            "task": "workers.consolidation_worker.auto_consolidate_stale_sessions",
            "schedule": 60 * 60, # Run every hour
        },
    },
)


logger.info(
    "Celery initialized: broker=%s",
    settings.redis_url,
)