# core/working_memory/session_store.py
# Redis-backed active conversation state for Memora.
# Maintains the latest messages and lightweight session metadata
# with automatic expiration and bounded memory growth.

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from backend.config import settings

from backend.models.message import Message


logger = logging.getLogger(__name__)


SESSION_KEY = (
    "session:{session_id}:messages"
)

META_KEY = (
    "session:{session_id}:meta"
)


class SessionStoreError(Exception):
    """Raised for session storage failures."""


class SessionStore:

    def __init__(
        self,
        redis_client,
    ) -> None:
        self.redis = (
            redis_client
        )

    @staticmethod
    def _message_key(
        session_id: UUID,
    ) -> str:
        return SESSION_KEY.format(
            session_id=session_id,
        )

    @staticmethod
    def _meta_key(
        session_id: UUID,
    ) -> str:
        return META_KEY.format(
            session_id=session_id,
        )



    async def add_message(
        self,
        session_id: UUID,
        message: Message,
    ) -> None:

        key = (
            self._message_key(
                session_id
            )
        )

        try:

            payload = (
                message
                .model_dump_json()
            )

            await self.redis.rpush(
                key,
                payload,
            )

            await self.redis.ltrim(
                key,
                -settings.max_session_messages,
                -1,
            )

            await self.redis.expire(
                key,
                settings.hot_cache_ttl_seconds,
            )

        except Exception as exc:
            raise SessionStoreError(
                f"Failed to store message: {exc}"
            ) from exc

    async def update_last_message(
        self,
        session_id: UUID,
        message: Message,
    ) -> None:
        key = self._message_key(session_id)
        try:
            exists = await self.redis.exists(key)
            if not exists:
                return
            payload = message.model_dump_json()
            await self.redis.lset(key, -1, payload)
        except Exception as exc:
            raise SessionStoreError(
                f"Failed to update last message: {exc}"
            ) from exc



    async def get_messages(
        self,
        session_id: UUID,
    ) -> list[
        Message
    ]:

        key = (
            self._message_key(
                session_id
            )
        )

        try:

            exists = (
                await self.redis.exists(
                    key
                )
            )

            if not exists:
                return []

            raw = (
                await self.redis.lrange(
                    key,
                    0,
                    -1,
                )
            )

            return [
                Message
                .model_validate_json(
                    item
                )
                for item
                in raw
            ]

        except Exception as exc:
            raise SessionStoreError(
                f"Failed to load session: {exc}"
            ) from exc



    async def get_session_meta(
        self,
        session_id: UUID,
    ) -> dict[
        str,
        Any,
    ]:

        key = (
            self._meta_key(
                session_id
            )
        )

        try:

            exists = (
                await self.redis.exists(
                    key
                )
            )

            if not exists:
                return {}

            result = (
                await self.redis.hgetall(
                    key
                )
            )

            return (
                result
                or {}
            )

        except Exception as exc:
            raise SessionStoreError(
                f"Failed reading metadata: {exc}"
            ) from exc



    async def set_session_meta(
        self,
        session_id: UUID,
        **kwargs: Any,
    ) -> None:

        key = (
            self._meta_key(
                session_id
            )
        )

        try:

            if kwargs:

                await self.redis.hset(
                    key,
                    mapping={
                        k: str(v)
                        for k, v
                        in kwargs.items()
                    },
                )

            await self.redis.expire(
                key,
                settings.hot_cache_ttl_seconds,
            )

        except Exception as exc:
            raise SessionStoreError(
                f"Failed writing metadata: {exc}"
            ) from exc



    async def clear_session(
        self,
        session_id: UUID,
    ) -> None:

        messages = (
            self._message_key(
                session_id
            )
        )

        meta = (
            self._meta_key(
                session_id
            )
        )

        try:

            await self.redis.delete(
                messages,
                meta,
            )

        except Exception as exc:
            raise SessionStoreError(
                f"Failed clearing session: {exc}"
            ) from exc



    async def count_messages(
        self,
        session_id: UUID,
    ) -> int:

        key = (
            self._message_key(
                session_id
            )
        )

        try:

            exists = (
                await self.redis.exists(
                    key
                )
            )

            if not exists:
                return 0

            return int(
                await self.redis.llen(
                    key
                )
            )

        except Exception as exc:
            raise SessionStoreError(
                f"Failed counting messages: {exc}"
            ) from exc


from backend.db.redis_client import redis_pool
import redis.asyncio as aioredis

session_store = SessionStore(
    redis_client=aioredis.Redis(connection_pool=redis_pool)
)

__all__ = [
    "SessionStore",
    "SessionStoreError",
    "SESSION_KEY",
    "META_KEY",
    "session_store",
]