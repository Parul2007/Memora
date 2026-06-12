"""
backend/core/orchestration/state_machine.py

Conversation turn lifecycle state machine.
"""

from __future__ import annotations

import logging
from dataclasses import field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic.dataclasses import dataclass

from backend.models.memory import (
    MemorySearchResult,
)
from backend.models.message import (
    PerceptionResult,
)


logger = logging.getLogger(__name__)


class ConversationState(
    str,
    Enum,
):
    IDLE = "idle"
    RECEIVED = "received"
    PERCEIVED = "perceived"
    RETRIEVED = "retrieved"
    REASONED = "reasoned"
    GENERATED = "generated"
    STORING = "storing"
    COMPLETE = "complete"
    ERROR = "error"


class StateMachineError(
    Exception
):
    """Raised for invalid state transitions."""


@dataclass(config={"arbitrary_types_allowed": True})
class TurnContext:
    session_id: UUID

    user_id: UUID

    query: str

    state: ConversationState = (
        ConversationState.IDLE
    )

    perception_result: (
        Optional[
            PerceptionResult
        ]
    ) = None

    retrieved_memories: (
        Optional[
            list[
                MemorySearchResult
            ]
        ]
    ) = None

    reasoning_trace: (
        Optional[
            str
        ]
    ) = None

    response_text: (
        Optional[
            str
        ]
    ) = None

    error: (
        Optional[
            str
        ]
    ) = None

    started_at: datetime = field(
        default_factory=lambda: datetime.now(
            timezone.utc
        )
    )

    state_transitions: list[
        tuple[
            ConversationState,
            datetime,
        ]
    ] = field(
        default_factory=list
    )


_ALLOWED = {
    ConversationState.IDLE: {
        ConversationState.RECEIVED,
    },
    ConversationState.RECEIVED: {
        ConversationState.PERCEIVED,
        ConversationState.ERROR,
    },
    ConversationState.PERCEIVED: {
        ConversationState.RETRIEVED,
        ConversationState.ERROR,
    },
    ConversationState.RETRIEVED: {
        ConversationState.REASONED,
        ConversationState.GENERATED,
        ConversationState.ERROR,
    },
    ConversationState.REASONED: {
        ConversationState.GENERATED,
        ConversationState.ERROR,
    },
    ConversationState.GENERATED: {
        ConversationState.STORING,
        ConversationState.ERROR,
        ConversationState.COMPLETE,
    },
    ConversationState.STORING: {
        ConversationState.COMPLETE,
        ConversationState.ERROR,
    },
    ConversationState.ERROR: {
        ConversationState.COMPLETE,
    },
}


class StateMachine:
    @staticmethod
    def transition(
        ctx: TurnContext,
        new_state: ConversationState,
    ) -> TurnContext:
        old_state = ctx.state

        if (
            new_state
            != ConversationState.ERROR
        ):
            allowed = (
                _ALLOWED.get(
                    old_state,
                    set(),
                )
            )

            if (
                new_state
                not in allowed
            ):
                raise StateMachineError(
                    (
                        "Illegal transition: "
                        f"{old_state.value}"
                        f" -> "
                        f"{new_state.value}"
                    )
                )

        timestamp = datetime.now(
            timezone.utc
        )

        ctx.state = (
            new_state
        )

        ctx.state_transitions.append(
            (
                new_state,
                timestamp,
            )
        )

        logger.info(
            "Turn %s: %s → %s",
            ctx.session_id,
            old_state.value,
            new_state.value,
        )

        return ctx

    @staticmethod
    def is_terminal(
        ctx: TurnContext,
    ) -> bool:
        return (
            ctx.state
            in {
                ConversationState.COMPLETE,
                ConversationState.ERROR,
            }
        )