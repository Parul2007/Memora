"""
backend/core/goal_planning/habit_analyzer.py

Habit detection and goal linking.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import UUID

from backend.models.memory import Memory
from backend.core.goal_planning.goal_tracker import (
    Goal,
    GoalTracker,
    GoalUpdate,
)
from backend.core.long_term_memory.stores.procedural_store import (
    ProceduralStore,
)


TOKEN_PATTERN = re.compile(r"\b\w+\b")
HABIT_BREAK_DAYS = 14


class HabitAnalyzerError(Exception):
    """Raised for habit analysis failures."""


class HabitAnalyzer:
    async def analyze_habits(
        self,
        user_id: UUID,
        procedural_store: ProceduralStore,
    ) -> list[dict]:
        try:
            raw_habits = (
                await procedural_store.get_top_habits(
                    user_id=user_id,
                )
            )

            analyzed = []

            for habit in raw_habits:
                access_count = int(
                    habit.get(
                        "access_count",
                        0,
                    )
                )

                analyzed.append(
                    {
                        "name": habit.get(
                            "name",
                            "",
                        ),
                        "frequency": int(
                            habit.get(
                                "frequency",
                                0,
                            )
                        ),
                        "last_observed": habit.get(
                            "last_observed",
                        ),
                        "strength": min(
                            access_count
                            / 10.0,
                            1.0,
                        ),
                    }
                )

            return analyzed

        except Exception as exc:
            raise HabitAnalyzerError(
                "Habit analysis failed."
            ) from exc

    async def link_habits_to_goal(
        self,
        goal: Goal,
        habits: list[dict],
        goal_tracker: GoalTracker,
    ) -> Goal:
        try:
            target_text = (
                (
                    goal.title
                    or ""
                )
                + " "
                + (
                    goal.description
                    or ""
                )
            ).lower()

            goal_tokens = set(
                TOKEN_PATTERN.findall(
                    target_text
                )
            )

            linked = []

            for habit in habits:
                habit_tokens = set(
                    TOKEN_PATTERN.findall(
                        habit.get(
                            "name",
                            "",
                        ).lower()
                    )
                )

                overlap = (
                    goal_tokens
                    & habit_tokens
                )

                if overlap:
                    linked.append(
                        habit
                    )

            return await goal_tracker.update(
                goal_id=goal.id,
                update=GoalUpdate(
                    habits=linked
                ),
            )

        except Exception as exc:
            raise HabitAnalyzerError(
                "Goal habit linking failed."
            ) from exc

    async def detect_habit_break(
        self,
        user_id: UUID,
        habit_memory: Memory,
    ) -> bool:
        try:
            last_accessed = getattr(
                habit_memory,
                "last_accessed_at",
                None,
            )

            if (
                last_accessed
                is None
            ):
                return True

            if (
                last_accessed.tzinfo
                is None
            ):
                last_accessed = (
                    last_accessed.replace(
                        tzinfo=timezone.utc
                    )
                )

            age_days = (
                datetime.now(
                    timezone.utc
                )
                - last_accessed
            ).days

            return (
                age_days
                >= HABIT_BREAK_DAYS
            )

        except Exception as exc:
            raise HabitAnalyzerError(
                "Habit break detection failed."
            ) from exc