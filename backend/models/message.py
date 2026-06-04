# models/message.py
# Canonical message and chat contract models for Memora.
# Defines request/response payloads, session state,
# and perception outputs shared across API and reasoning layers.

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

from backend.models.memory import (
    MemorySearchResult,
    MemoryType,
)

from backend.config import settings

settings.embedding_dims = 1024


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    id: UUID = Field(
        default_factory=uuid4,
    )

    session_id: UUID

    role: MessageRole

    content: str = Field(
        min_length=1,
        max_length=50000,
    )

    created_at: datetime = Field(
        default_factory=utc_now,
    )

    metadata: dict[str, Any] = Field(
        default_factory=dict,
    )

    status: str = Field(
        default="complete",
    )

    thinking_duration_ms: int = Field(
        default=0,
    )

    token_count: int = Field(
        default=0,
    )

    memories_retrieved: list[dict[str, Any]] = Field(
        default_factory=list,
    )

    parent_id: UUID | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class ChatRequest(BaseModel):
    user_id: UUID

    session_id: UUID | None = None

    content: str = Field(
        min_length=1,
        max_length=10000,
    )

    stream: bool = False

    model_config = ConfigDict(
        from_attributes=True,
    )


class ChatResponse(BaseModel):
    session_id: UUID

    message: Message

    retrieved_memories: list[
        MemorySearchResult
    ] = Field(
        default_factory=list,
    )

    reasoning_trace: str | None = None

    response_time_ms: float

    model_config = ConfigDict(
        from_attributes=True,
    )


class SessionSummary(BaseModel):
    session_id: UUID

    user_id: UUID

    message_count: int

    started_at: datetime

    last_message_at: datetime

    summary: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class PerceptionResult(BaseModel):
    text: str

    embedding: list[float]

    entities: list[
        dict[str, Any]
    ] = Field(
        default_factory=list,
    )

    memory_type: MemoryType

    classification_scores: dict[
        str,
        float,
    ] = Field(
        default_factory=dict,
    )

    detected_language: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )

    @field_validator("embedding")
    @classmethod
    def validate_embedding(
        cls,
        value: list[float],
    ) -> list[float]:

        if len(value) != settings.embedding_dims:
            raise ValueError(
                f"Embedding must contain "
                f"exactly {settings.embedding_dims} values"
            )

        return value


__all__ = [
    "MessageRole",
    "Message",
    "ChatRequest",
    "ChatResponse",
    "SessionSummary",
    "PerceptionResult",
]