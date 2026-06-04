"""
backend/db/postgres.py

Async PostgreSQL engine and session management.

Provides:
- Shared AsyncEngine singleton
- Shared async_sessionmaker singleton
- Per-request session dependency
- Database startup validation
- Graceful shutdown cleanup
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from urllib.parse import urlsplit
from urllib.parse import urlunsplit

from pgvector.sqlalchemy import Vector
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine

from backend.config import settings


logger = logging.getLogger(__name__)

# Force pgvector registration/import visibility
_VECTOR_TYPE = Vector


class PostgresError(Exception):
    """Raised for PostgreSQL initialization or session failures."""


def _mask_postgres_url(url: str) -> str:
    parsed = urlsplit(url)

    if "@" not in parsed.netloc:
        return url

    credentials, host = parsed.netloc.rsplit("@", 1)

    if ":" not in credentials:
        return urlunsplit(
            (
                parsed.scheme,
                f"***@{host}",
                parsed.path,
                parsed.query,
                parsed.fragment,
            )
        )

    username, _ = credentials.split(":", 1)

    return urlunsplit(
        (
            parsed.scheme,
            f"{username}:***@{host}",
            parsed.path,
            parsed.query,
            parsed.fragment,
        )
    )


engine: AsyncEngine = create_async_engine(
    settings.postgres_url,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    echo=settings.is_development,
)

logger.info(
    "Database engine created: %s",
    _mask_postgres_url(settings.postgres_url),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def _warm_pool() -> None:
    try:
        async with engine.begin() as connection:
            await connection.run_sync(
                lambda conn: None,
            )

    except Exception as exc:
        raise PostgresError(
            "Failed to warm PostgreSQL connection pool"
        ) from exc


async def get_async_session(
) -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()

        except Exception:
            await session.rollback()
            raise

        finally:
            await session.close()


async def init_db() -> None:
    try:
        await _warm_pool()

        async with engine.connect() as connection:
            await connection.execute(
                text("SELECT 1")
            )

        logger.info(
            "PostgreSQL connection validated"
        )

    except SQLAlchemyError as exc:
        logger.exception(
            "postgres_init_failed"
        )

        raise PostgresError(
            "Database initialization failed"
        ) from exc

    except Exception as exc:
        logger.exception(
            "postgres_startup_failed"
        )

        raise PostgresError(
            "Unexpected PostgreSQL startup failure"
        ) from exc


async def close_db() -> None:
    try:
        await engine.dispose()

        logger.info(
            "PostgreSQL engine disposed"
        )

    except Exception as exc:
        logger.exception(
            "postgres_shutdown_failed"
        )

        raise PostgresError(
            "Failed to close database engine"
        ) from exc


__all__ = [
    "PostgresError",
    "engine",
    "AsyncSessionLocal",
    "get_async_session",
    "init_db",
    "close_db",
]