# models/events.py
# Typed internal event contracts for Memora.
# Events are exchanged across orchestration, Celery workers,
# memory pipelines, retrieval, and consolidation subsystems.

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)

from backend.models.memory import MemoryCreate
from backend.models.message import (
    ChatRequest,
    PerceptionResult,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class EventType(str, Enum):
    MESSAGE_RECEIVED = "message_received"

    PERCEPTION_COMPLETE = "perception_complete"

    RETRIEVAL_COMPLETE = "retrieval_complete"

    RESPONSE_GENERATED = "response_generated"

    MEMORY_STORE_REQUESTED = "memory_store_requested"

    MEMORY_STORED = "memory_stored"

    SESSION_ENDED = "session_ended"

    CONSOLIDATION_REQUESTED = "consolidation_requested"

    CONSOLIDATION_COMPLETE = "consolidation_complete"

    DECAY_TICK = "decay_tick"


    ERROR_OCCURRED = "error_occurred"


class BaseEvent(BaseModel):
    event_id: UUID = Field(
        default_factory=uuid4,
    )

    event_type: EventType

    user_id: UUID

    session_id: UUID

    occurred_at: datetime = Field(
        default_factory=utc_now,
    )

    metadata: dict[str, Any] = Field(
        default_factory=dict,
    )

    model_config = ConfigDict(
        from_attributes=True,
    )

    def to_dict(
        self,
    ) -> dict[str, Any]:
        return self.model_dump(
            mode="json",
        )


class MessageReceivedEvent(
    BaseEvent,
):
    event_type: EventType = (
        EventType.MESSAGE_RECEIVED
    )

    raw_content: str

    chat_request: ChatRequest

    model_config = ConfigDict(
        from_attributes=True,
    )


class PerceptionCompleteEvent(
    BaseEvent,
):
    event_type: EventType = (
        EventType.PERCEPTION_COMPLETE
    )

    perception_result: (
        PerceptionResult
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


class MemoryStoreRequestedEvent(
    BaseEvent,
):
    event_type: EventType = (
        EventType.MEMORY_STORE_REQUESTED
    )

    memory_create: MemoryCreate

    model_config = ConfigDict(
        from_attributes=True,
    )


class SessionEndedEvent(
    BaseEvent,
):
    event_type: EventType = (
        EventType.SESSION_ENDED
    )

    message_count: int

    session_duration_seconds: float

    model_config = ConfigDict(
        from_attributes=True,
    )


class ConsolidationRequestedEvent(
    BaseEvent,
):
    event_type: EventType = (
        EventType.CONSOLIDATION_REQUESTED
    )

    session_id: UUID

    memory_ids: list[UUID]

    model_config = ConfigDict(
        from_attributes=True,
    )


class ErrorEvent(
    BaseEvent,
):
    event_type: EventType = (
        EventType.ERROR_OCCURRED
    )

    error_type: str

    error_message: str

    stack_trace: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )


__all__ = [
    "EventType",
    "BaseEvent",
    "MessageReceivedEvent",
    "PerceptionCompleteEvent",
    "MemoryStoreRequestedEvent",
    "SessionEndedEvent",
    "ConsolidationRequestedEvent",
    "ErrorEvent",
]