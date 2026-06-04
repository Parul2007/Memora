"""
backend/db/qdrant_client.py

Async Qdrant client factory.

Provides:
- Shared AsyncQdrantClient singleton
- Collection initialization
- Health checking
- Graceful shutdown

Qdrant is used exclusively as cold memory storage.
"""

from __future__ import annotations

import logging

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance
from qdrant_client.models import FieldCondition
from qdrant_client.models import Filter
from qdrant_client.models import MatchValue
from qdrant_client.models import PointStruct
from qdrant_client.models import VectorParams

from backend.config import settings


logger = logging.getLogger(__name__)


# CRITICAL:
# vector size must be 1024 —
# bge-large-en-v1.5 output dimension

VECTOR_SIZE = 1024


# Point IDs must be str(uuid) —
# raw UUID objects cause Qdrant type errors
_POINT_ID_FORMAT = str


class QdrantError(Exception):
    """Raised for Qdrant lifecycle failures."""


qdrant = AsyncQdrantClient(
    url=settings.qdrant_url,
)

logger.info(
    "Qdrant client created: %s",
    settings.qdrant_url,
)


async def get_qdrant_client(
) -> AsyncQdrantClient:
    """
    Return shared Qdrant client.
    """

    return qdrant


async def init_qdrant() -> None:
    """
    Ensure memories collection exists.
    """

    try:
        exists = await qdrant.collection_exists(
            settings.qdrant_collection_name,
        )

        if not exists:
            await qdrant.create_collection(
                collection_name=(
                    settings.qdrant_collection_name
                ),
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=Distance.COSINE,
                ),
            )

        logger.info(
            "Qdrant collection '%s' ready",
            settings.qdrant_collection_name,
        )

    except Exception as exc:
        logger.exception(
            "qdrant_init_failed",
        )

        raise QdrantError(
            "Failed to initialize Qdrant"
        ) from exc


async def check_qdrant_health() -> bool:
    """
    Validate Qdrant connectivity.
    """

    try:
        await qdrant.get_collections()

        return True

    except Exception:
        logger.exception(
            "qdrant_health_check_failed",
        )

        return False


async def close_qdrant() -> None:
    """
    Shutdown Qdrant client.
    """

    try:
        await qdrant.close()

        logger.info(
            "Qdrant client closed",
        )

    except Exception as exc:
        logger.exception(
            "qdrant_shutdown_failed",
        )

        raise QdrantError(
            "Failed to close Qdrant client",
        ) from exc


__all__ = [
    "QdrantError",
    "qdrant",
    "PointStruct",
    "Filter",
    "FieldCondition",
    "MatchValue",
    "get_qdrant_client",
    "init_qdrant",
    "check_qdrant_health",
    "close_qdrant",
]