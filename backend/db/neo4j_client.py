"""
backend/db/neo4j_client.py

Async Neo4j driver factory.

Provides:
- Shared AsyncDriver singleton
- Connection initialization
- Constraint creation
- Health checks
- Graceful shutdown

Neo4j is responsible for knowledge graph persistence.
"""

from __future__ import annotations

import logging

from neo4j import AsyncDriver
from neo4j import AsyncGraphDatabase

from backend.config import settings


logger = logging.getLogger(__name__)


# CRITICAL:
# always use async with driver.session()
# never the sync form


ENTITY_CONSTRAINT = """
CREATE CONSTRAINT entity_unique
IF NOT EXISTS
FOR (e:Entity)
REQUIRE (e.text, e.user_id) IS UNIQUE
"""

MEMORY_CONSTRAINT = """
CREATE CONSTRAINT memory_unique
IF NOT EXISTS
FOR (m:Memory)
REQUIRE m.id IS UNIQUE
"""


class Neo4jError(Exception):
    """Raised for Neo4j connection and lifecycle failures."""


driver: AsyncDriver | None = None


async def init_neo4j() -> None:
    """
    Initialize Neo4j connection and
    enforce graph constraints.
    """

    global driver

    try:
        driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(
                settings.neo4j_user,
                settings.neo4j_password,
            ),
        )

        # CRITICAL:
        # always use async sessions
        async with driver.session() as session:
            result = await session.run(
                "RETURN 1"
            )

            await result.consume()

            await session.run(
                ENTITY_CONSTRAINT,
            )

            await session.run(
                MEMORY_CONSTRAINT,
            )

        logger.info(
            "Neo4j connected and constraints verified"
        )

    except Exception as exc:
        logger.exception(
            "neo4j_startup_failed",
        )

        if driver is not None:
            try:
                await driver.close()
            except Exception:
                pass

        driver = None

        raise Neo4jError(
            "Neo4j initialization failed"
        ) from exc


async def get_neo4j_driver(
) -> AsyncDriver:
    """
    Return initialized driver.
    """

    if driver is None:
        raise Neo4jError(
            "Neo4j driver not initialized"
        )

    return driver


async def check_neo4j_health(
) -> bool:
    """
    Validate Neo4j connectivity.
    """

    if driver is None:
        return False

    try:
        # CRITICAL:
        # async session only
        async with driver.session() as session:
            result = await session.run(
                "RETURN 1"
            )

            await result.consume()

        return True

    except Exception:
        logger.exception(
            "neo4j_health_check_failed",
        )

        return False


async def close_neo4j() -> None:
    """
    Shutdown Neo4j driver.
    """

    global driver

    if driver is None:
        return

    try:
        await driver.close()

        logger.info(
            "Neo4j driver closed"
        )

    except Exception as exc:
        logger.exception(
            "neo4j_shutdown_failed",
        )

        raise Neo4jError(
            "Failed to close Neo4j"
        ) from exc

    finally:
        driver = None


__all__ = [
    "Neo4jError",
    "driver",
    "init_neo4j",
    "get_neo4j_driver",
    "check_neo4j_health",
    "close_neo4j",
]