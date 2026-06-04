# core/working_memory/attention_window.py
# Builds the active working-memory context for response generation.
# Combines recent conversation state with retrieved long-term memories,
# compresses old history, and outputs a context window suitable for LLM input.

from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

from backend.config import settings

from backend.models.message import (
    Message,
    MessageRole,
)

from backend.models.memory import (
    MemorySearchResult,
)

from backend.core.working_memory.summarizer import (
    summarise_session,
)

from backend.core.working_memory.session_store import (
    SessionStore,
)


logger = logging.getLogger(__name__)

MAX_CONTEXT_TOKENS = 3000


@dataclass(slots=True)
class AttentionWindow:
    session_id: UUID
    recent_messages: list[Message]
    retrieved_memories: list[
        MemorySearchResult
    ]
    session_summary: str | None
    formatted_context: str
    token_estimate: int


class AttentionWindowManager:

    async def build(
        self,
        session_id: UUID,
        user_id: UUID,
        retrieved_memories: list[
            MemorySearchResult
        ],
        session_store: SessionStore,
    ) -> AttentionWindow:

        messages = (
            await session_store
            .get_messages(
                session_id=session_id,
            )
        )

        messages = sorted(
            messages,
            key=lambda m:
                m.created_at,
        )

        session_summary = None


        if (
            len(messages)
            >
            (
                settings.max_session_messages
                // 2
            )
        ):

            midpoint = (
                len(messages)
                // 2
            )

            older = (
                messages[
                    :midpoint
                ]
            )

            recent = (
                messages[
                    midpoint:
                ]
            )

            try:

                session_summary = (
                    await summarise_session(
                        older
                    )
                )

            except Exception:
                logger.exception(
                    "Session summarisation failed"
                )

                session_summary = None
                recent = messages

        else:
            recent = messages



        ranked_memories = sorted(
            retrieved_memories,
            key=lambda m:
            (
                m.rerank_score
                if m.rerank_score
                is not None
                else -1.0
            ),
            reverse=True,
        )[:
            settings.max_context_memories
        ]



        def build_context(
            memories: list[
                MemorySearchResult
            ],
        ) -> str:

            memory_lines = []

            if memories:
                for result in memories:
                    memory = result.memory
                    memory_lines.append(
                        f"({memory.memory_type.value.upper()}) {memory.content}"
                    )

            conversation = []

            if session_summary:

                conversation.append(
                    (
                        "[Earlier: "
                        f"{session_summary}]"
                    )
                )

            for msg in recent:

                role = (
                    "User"
                    if (
                        msg.role
                        ==
                        MessageRole.USER
                    )
                    else "Assistant"
                )

                conversation.append(
                    (
                        f"{role}: "
                        f"{msg.content}"
                    )
                )

            return (
                "[MEMORY CONTEXT]\n"
                +
                "\n".join(
                    memory_lines
                )
                +
                "\n\n"
                +
                "[CONVERSATION]\n"
                +
                "\n".join(
                    conversation
                )
            )



        context = (
            build_context(
                ranked_memories
            )
        )

        token_estimate = (
            len(context)
            // 4
        )



        while (
            token_estimate
            >
            MAX_CONTEXT_TOKENS
            and ranked_memories
        ):

            ranked_memories.pop()

            context = (
                build_context(
                    ranked_memories
                )
            )

            token_estimate = (
                len(context)
                // 4
            )



        logger.info(
            (
                "AttentionWindow built: "
                f"{len(ranked_memories)} memories, "
                f"{len(recent)} messages, "
                f"~{token_estimate} tokens"
            )
        )



        return AttentionWindow(
            session_id=session_id,

            recent_messages=recent,

            retrieved_memories=(
                ranked_memories
            ),

            session_summary=(
                session_summary
            ),

            formatted_context=(
                context
            ),

            token_estimate=(
                token_estimate
            ),
        )


__all__ = [
    "AttentionWindow",
    "AttentionWindowManager",
]
