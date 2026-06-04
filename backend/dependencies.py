"""
backend/dependencies.py

FastAPI dependency injection layer.

Provides reusable dependencies for:
- PostgreSQL sessions
- Redis client
- Qdrant client
- Neo4j driver
- Authenticated users
"""

from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

import jwt
import redis.asyncio as aioredis
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from fastapi.security import OAuth2PasswordBearer
from neo4j import AsyncDriver
from qdrant_client import AsyncQdrantClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db.neo4j_client import get_neo4j_driver
from backend.db.postgres import get_async_session
from backend.db.qdrant_client import get_qdrant_client
from backend.db.redis_client import get_redis_client


logger = logging.getLogger(__name__)

DEV_USER_ID = UUID(
    "00000000-0000-0000-0000-000000000001"
)


class AuthError(Exception):
    """Raised for authentication failures."""


class DependencyError(Exception):
    """Raised for dependency resolution failures."""


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token",
    auto_error=False,
)


DatabaseSession = Annotated[
    AsyncSession,
    Depends(
        get_async_session,
    ),
]

RedisClient = Annotated[
    aioredis.Redis,
    Depends(
        get_redis_client,
    ),
]

QdrantClientDep = Annotated[
    AsyncQdrantClient,
    Depends(
        get_qdrant_client,
    ),
]

Neo4jDriverDep = Annotated[
    AsyncDriver,
    Depends(
        get_neo4j_driver,
    ),
]


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )


_jwk_client: jwt.PyJWKClient | None = None


def get_jwk_client(supabase_url: str) -> jwt.PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwk_client = jwt.PyJWKClient(jwks_url)
    return _jwk_client


async def get_current_user(
    token: str | None = Depends(
        oauth2_scheme,
    ),
) -> UUID:
    if not token or token == "dummy-jwt-token":
        if settings.is_development:
            logger.warning("Auth: Development mode active — bypassing token validation and returning DEV_USER_ID")
            return DEV_USER_ID
        raise _unauthorized()

    try:
        # Decode JWT header to check algorithm
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg in ["RS256", "ES256"]:
            if not settings.supabase_url:
                raise AuthError(
                    "SUPABASE_URL is not configured for JWKS validation"
                )
            client = get_jwk_client(settings.supabase_url)
            signing_key = client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                options={"verify_aud": False},
            )
        else:
            if not settings.supabase_jwt_secret:
                raise AuthError(
                    "SUPABASE_JWT_SECRET is not configured"
                )
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        user_id = payload.get(
            "sub",
        )

        if not user_id:
            raise AuthError(
                "Missing sub claim"
            )

        uid = UUID(
            str(user_id),
        )

        logger.debug(
            "Auth: resolved user_id=%s",
            str(uid),
        )

        return uid

    except jwt.ExpiredSignatureError as exc:
        logger.warning(f"Auth: Token expired: {exc}")
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Token expired",
        ) from exc

    except (
        jwt.InvalidTokenError,
        ValueError,
        AuthError,
    ) as exc:
        logger.warning(f"Auth: Token validation failed: {exc} | Token used: {token[:15]}... | Secret/URL configured: {settings.supabase_jwt_secret[:10] if settings.supabase_jwt_secret else 'N/A'}/{settings.supabase_url}")
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=f"Invalid token: {exc}",
        ) from exc

    except Exception as exc:
        logger.exception(
            "auth_resolution_failed",
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to resolve user authentication context",
        ) from exc


async def get_optional_user(
    token: str | None = Depends(
        oauth2_scheme,
    ),
) -> UUID | None:
    if not token:
        return None

    try:
        return await get_current_user(
            token,
        )

    except Exception:
        return None


CurrentUser = Annotated[
    UUID,
    Depends(
        get_current_user,
    ),
]

OptionalUser = Annotated[
    UUID | None,
    Depends(
        get_optional_user,
    ),
]


__all__ = [
    "AuthError",
    "DependencyError",
    "DatabaseSession",
    "RedisClient",
    "QdrantClientDep",
    "Neo4jDriverDep",
    "CurrentUser",
    "OptionalUser",
    "get_current_user",
    "get_optional_user",
]