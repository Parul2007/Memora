"""
backend/core/goal_planning/milestone_engine.py

Automatic milestone completion and progress tracking.
"""

from __future__ import annotations

import re
from copy import deepcopy
from datetime import datetime, timezone
from uuid import UUID, uuid4

from backend.models.memory import Memory
from backend.core.goal_planning.goal_tracker import (
    Goal,
    GoalTracker,
    GoalUpdate,
)


TOKEN_PATTERN = re.compile(r"\b\w+\b")


class MilestoneEngineError(Exception):
    """Raised for milestone processing failures."""


class MilestoneEngine:
    async def check_milestone_completion(
        self,
        goal: Goal,
        recent_memories: list[Memory],
    ) -> list[str]:
        try:
            completed: list[str] = []

            if (
                not goal.milestones
                or not recent_memories
            ):
                return completed

            memory_text = " ".join(
                getattr(
                    memory,
                    "content",
                    "",
                ).lower()
                for memory in recent_memories
            )

            memory_words = set(
                TOKEN_PATTERN.findall(
                    memory_text
                )
            )

            for milestone in (
                goal.milestones
            ):
                if milestone.get(
                    "completed",
                    False,
                ):
                    continue

                title = milestone.get(
                    "title",
                    "",
                )

                title_words = {
                    w
                    for w in TOKEN_PATTERN.findall(
                        title.lower()
                    )
                    if len(w) > 2
                }

                if (
                    title_words
                    and title_words.issubset(
                        memory_words
                    )
                ):
                    completed.append(
                        title
                    )

            return completed

        except Exception as exc:
            raise MilestoneEngineError(
                "Milestone completion check failed."
            ) from exc

    async def update_progress(
        self,
        goal_id: UUID,
        user_id: UUID,
        goal_tracker: GoalTracker,
        completed_milestones: list[str],
    ) -> Goal:
        try:
            goal = await goal_tracker.get(
                goal_id=goal_id,
                user_id=user_id,
            )

            if goal is None:
                raise MilestoneEngineError(
                    "Goal not found."
                )

            milestones = deepcopy(
                goal.milestones
            )

            for milestone in (
                milestones
            ):
                if (
                    milestone.get(
                        "title"
                    )
                    in completed_milestones
                ):
                    milestone[
                        "completed"
                    ] = True

            total = max(
                1,
                len(
                    milestones
                ),
            )

            completed_count = sum(
                bool(
                    m.get(
                        "completed",
                        False,
                    )
                )
                for m in milestones
            )

            progress = (
                completed_count
                / total
            )

            return await goal_tracker.update(
                goal_id=goal_id,
                update=GoalUpdate(
                    milestones=milestones,
                    progress_pct=progress,
                ),
            )

        except Exception as exc:
            raise MilestoneEngineError(
                "Progress update failed."
            ) from exc

    async def add_milestone(
        self,
        goal_id: UUID,
        user_id: UUID,
        title: str,
        goal_tracker: GoalTracker,
    ) -> Goal:
        try:
            goal = await goal_tracker.get(
                goal_id=goal_id,
                user_id=user_id,
            )

            if goal is None:
                raise MilestoneEngineError(
                    "Goal not found."
                )

            milestones = list(
                goal.milestones
            )

            milestones.append(
                {
                    "id": str(
                        uuid4()
                    ),
                    "title": title,
                    "completed": False,
                    "created_at": (
                        datetime.now(
                            timezone.utc
                        ).isoformat()
                    ),
                }
            )

            return await goal_tracker.update(
                goal_id=goal_id,
                update=GoalUpdate(
                    milestones=milestones,
                ),
            )

        except Exception as exc:
            raise MilestoneEngineError(
                "Milestone creation failed."
            ) from exc