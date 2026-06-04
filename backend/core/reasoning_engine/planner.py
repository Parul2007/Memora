"""
backend/core/reasoning_engine/planner.py

Rule-based response planning.
"""

from __future__ import annotations

import logging
import re
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from backend.models.memory import (
    MemorySearchResult,
)
from backend.models.user import (
    UserContext,
)


logger = logging.getLogger(__name__)


QUESTION_PATTERN = re.compile(
    r"\?$|^(who|what|when|where|why|how|can|should|do|does|is|are)\b",
    re.I,
)


class PlannerError(Exception):
    """Raised when planning fails."""


class ResponsePlan(BaseModel):
    strategy: str

    tone_override: Optional[str] = None

    proactive_memory: Optional[UUID] = None

    should_ask_followup: bool

    followup_question: Optional[str] = None


class Planner:
    async def plan(
        self,
        query: str,
        user_context: UserContext,
        retrieved_memories: list[
            MemorySearchResult
        ],
        reasoning_trace: str,
    ) -> ResponsePlan:
        try:
            strategy = "answer"
            tone_override = None
            proactive_memory = None
            should_ask_followup = False
            followup_question = None

            query_lower = query.lower()

            if (
                not retrieved_memories
                and self._is_question(
                    query
                )
            ):
                strategy = "clarify"

                should_ask_followup = True

                followup_question = (
                    "Could you give a little more context so I can help accurately?"
                )

            emotional_baseline = float(
                getattr(
                    user_context,
                    "emotional_baseline",
                    0.0,
                )
            )

            if emotional_baseline < -0.5:
                tone_override = (
                    "empathetic"
                )

            goals = getattr(
                user_context,
                "active_goals",
                [],
            )

            if (
                strategy
                == "answer"
                and goals
            ):
                for goal in goals:
                    goal_text = str(
                        goal
                    ).lower()

                    tokens = [
                        t
                        for t in goal_text.split()
                        if len(t) > 3
                    ]

                    if any(
                        token
                        in query_lower
                        for token in tokens
                    ):
                        strategy = (
                            "goal_check"
                        )
                        break

            if (
                strategy
                == "answer"
            ):
                for result in (
                    retrieved_memories
                ):
                    memory = (
                        result.memory
                    )

                    importance = float(
                        getattr(
                            memory,
                            "importance_score",
                            0.0,
                        )
                    )

                    content = str(
                        getattr(
                            memory,
                            "content",
                            "",
                        )
                    ).lower()

                    if (
                        importance
                        > 0.9
                        and content
                        and content
                        not in query_lower
                    ):
                        proactive_memory = (
                            memory.id
                        )

                        strategy = (
                            "surface_memory"
                        )
                        break

            if (
                retrieved_memories
                and strategy
                != "clarify"
            ):
                top_memory = (
                    retrieved_memories[
                        0
                    ].memory
                )

                memory_type = str(
                    getattr(
                        top_memory,
                        "memory_type",
                        "memory",
                    )
                ).lower()

                followup_question = (
                    self._build_followup(
                        memory_type
                    )
                )

                should_ask_followup = (
                    followup_question
                    is not None
                )

            logger.info(
                "Plan: strategy=%s, tone=%s, proactive=%s",
                strategy,
                tone_override,
                proactive_memory
                is not None,
            )

            return ResponsePlan(
                strategy=strategy,
                tone_override=tone_override,
                proactive_memory=proactive_memory,
                should_ask_followup=should_ask_followup,
                followup_question=followup_question,
            )

        except Exception as exc:
            logger.exception(
                "planner_failed"
            )

            raise PlannerError(
                "Planning failed."
            ) from exc

    @staticmethod
    def _is_question(
        query: str,
    ) -> bool:
        return bool(
            QUESTION_PATTERN.search(
                query.strip()
            )
        )

    @staticmethod
    def _build_followup(
        memory_type: str,
    ) -> Optional[str]:
        if (
            "episodic"
            in memory_type
        ):
            return (
                "Does this connect to a recent event?"
            )

        if (
            "semantic"
            in memory_type
        ):
            return (
                "Would you like more detail on this?"
            )

        if (
            "procedural"
            in memory_type
        ):
            return (
                "Do you want step-by-step guidance?"
            )

        if (
            "emotional"
            in memory_type
        ):
            return (
                "How are you feeling about this now?"
            )

        return None