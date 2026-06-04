"""
backend/db/redis_client.py

Async Redis client factory.

Provides:
- Shared Redis connection pool
- Redis client acquisition
- Redis health checking
- Graceful shutdown handling

CRITICAL:
decode_responses=True must always remain enabled.
Raw bytes silently break JSON operations across session_store,
dashboard caching, and adaptive_learner.
"""

from __future__ import annotations

import logging
from urllib.parse import urlsplit
from urllib.parse import urlunsplit

import redis.asyncio as aioredis

from backend.config import settings


logger = logging.getLogger(__name__)


class RedisError(Exception):
    """Raised for Redis lifecycle failures."""


def _mask_redis_url(
    url: str,
) -> str:
    parsed = urlsplit(url)

    if "@" not in parsed.netloc:
        return url

    credentials, host = parsed.netloc.rsplit(
        "@",
        1,
    )

    if ":" in credentials:
        username, _ = credentials.split(
            ":",
            1,
        )
        masked = f"{username}:***@{host}"

    else:
        masked = f"***@{host}"

    return urlunsplit(
        (
            parsed.scheme,
            masked,
            parsed.path,
            parsed.query,
            parsed.fragment,
        )
    )


# CRITICAL:
# decode_responses=True is mandatory —
# raw bytes silently break session_store.py
redis_pool = aioredis.ConnectionPool.from_url(
    settings.redis_url,
    decode_responses=True,
    max_connections=20,
)

logger.info(
    "Redis pool created: %s",
    _mask_redis_url(
        settings.redis_url,
    ),
)


async def get_redis_client(
) -> aioredis.Redis:
    """
    Return a Redis client backed by
    the shared connection pool.
    """

    return aioredis.Redis(
        connection_pool=redis_pool,
    )


async def check_redis_health(
) -> bool:
    """
    Validate Redis connectivity.
    """

    try:
        client = await get_redis_client()

        result = await client.ping()

        return result is True

    except Exception:
        logger.exception(
            "redis_health_check_failed",
        )

        return False


async def close_redis() -> None:
    """
    Shutdown Redis connection pool.
    """

    try:
        await redis_pool.disconnect()

        logger.info(
            "Redis pool disconnected",
        )

    except Exception as exc:
        logger.exception(
            "redis_shutdown_failed",
        )

        raise RedisError(
            "Failed to close Redis pool",
        ) from exc


__all__ = [
    "RedisError",
    "redis_pool",
    "get_redis_client",
    "check_redis_health",
    "close_redis",
]