# models/memory.py
# Canonical memory data contracts for Memora.
# Shared across API, retrieval, storage, consolidation, and reasoning layers.
# Mirrors PostgreSQL schema and provides strict validation guarantees.

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

from backend.config import settings

settings.embedding_dims = 1024


class MemoryType(str, Enum):
    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    PROCEDURAL = "procedural"
    EMOTIONAL = "emotional"


class MemoryBase(BaseModel):
    user_id: UUID

    content: str = Field(
        min_length=1,
        max_length=10000,
    )

    memory_type: MemoryType

    importance_score: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
    )

    emotional_weight: float = Field(
        default=0.0,
        ge=-1.0,
        le=1.0,
    )

    entities: list[str] = Field(
        default_factory=list,
    )

    metadata: dict[str, Any] = Field(
        default_factory=dict,
    )

    source_session_id: UUID | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class MemoryCreate(MemoryBase):
    embedding: list[float]

    @field_validator("embedding")
    @classmethod
    def validate_embedding(
        cls,
        value: list[float],
    ) -> list[float]:

        if len(value) != settings.embedding_dims:
            raise ValueError(
                f"Embedding dimension must be exactly "
                f"{settings.embedding_dims}, "
                f"received {len(value)}"
            )

        return value


class Memory(MemoryBase):
    id: UUID

    embedding: list[float]

    decay_factor: float = 1.0

    access_count: int = 0

    last_accessed_at: datetime | None = None

    created_at: datetime

    updated_at: datetime

    expires_at: datetime | None = None

    is_consolidated: bool = False

    model_config = ConfigDict(
        from_attributes=True,
    )

    @field_validator(
        "created_at",
        "updated_at",
        "last_accessed_at",
        "expires_at",
        mode="after",
    )
    @classmethod
    def validate_timezone(
        cls,
        value: datetime | None,
    ) -> datetime | None:

        if (
            value is not None
            and value.tzinfo is None
        ):
            raise ValueError(
                "Datetime values must be timezone-aware"
            )

        return value

    def __repr__(self) -> str:
        return (
            "Memory("
            f"id={self.id}, "
            f"memory_type={self.memory_type.value}"
            ")"
        )


class MemoryUpdate(BaseModel):

    content: str | None = None

    importance_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
    )

    emotional_weight: float | None = Field(
        default=None,
        ge=-1.0,
        le=1.0,
    )

    decay_factor: float | None = Field(
        default=None,
        ge=0.0,
    )

    is_consolidated: bool | None = None

    entities: list[str] | None = None

    metadata: dict[str, Any] | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class MemorySearchQuery(BaseModel):
    user_id: UUID

    query_text: str

    query_embedding: list[float]

    memory_types: list[MemoryType] | None = None

    top_k: int = Field(
        default=15,
        ge=1,
        le=50,
    )

    min_importance: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
    )

    include_expired: bool = False

    model_config = ConfigDict(
        from_attributes=True,
    )

    @field_validator("query_embedding")
    @classmethod
    def validate_query_embedding(
        cls,
        value: list[float],
    ) -> list[float]:

        if len(value) != settings.embedding_dims:
            raise ValueError(
                f"Query embedding must contain "
                f"{settings.embedding_dims} values"
            )

        return value


class MemorySearchResult(BaseModel):
    memory: Memory

    similarity_score: float

    rerank_score: float | None = None

    retrieval_explanation: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


class ConsolidationResult(BaseModel):
    original_memory_ids: list[UUID]

    consolidated_content: str

    memory_type: MemoryType

    importance_score: float

    entities: list[str]

    model_config = ConfigDict(
        from_attributes=True,
    )


__all__ = [
    "MemoryType",
    "MemoryBase",
    "MemoryCreate",
    "Memory",
    "MemoryUpdate",
    "MemorySearchQuery",
    "MemorySearchResult",
    "ConsolidationResult",
]