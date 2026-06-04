"""
backend/core/goal_planning/goal_tracker.py

CRUD operations for user goals.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import text

from backend.db.postgres import AsyncSessionLocal as db


class GoalTrackerError(Exception):
    """Raised for goal tracking failures."""


class Goal(BaseModel):
    id: UUID
    user_id: UUID

    title: str
    description: str | None = None

    status: str = "active"

    priority: int = 1

    target_date: date | None = None

    progress_pct: float = 0.0

    milestones: list[dict] = Field(
        default_factory=list
    )

    habits: list[dict] = Field(
        default_factory=list
    )

    created_at: datetime
    updated_at: datetime


class GoalCreate(BaseModel):
    user_id: UUID

    title: str

    description: str | None = None

    priority: int = 1

    target_date: date | None = None


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None

    status: str | None = None

    priority: int | None = None

    target_date: date | None = None

    progress_pct: float | None = None

    milestones: list[dict] | None = None

    habits: list[dict] | None = None


class GoalTracker:
    async def create(
        self,
        goal_create: GoalCreate,
    ) -> Goal:
        try:
            query = text(
                """
                INSERT INTO goals (
                    user_id,
                    title,
                    description,
                    priority,
                    target_date
                )
                VALUES (
                    :user_id,
                    :title,
                    :description,
                    :priority,
                    :target_date
                )
                RETURNING *
                """
            )

            async with db() as session:
                result = await session.execute(
                    query,
                    {
                        **goal_create.model_dump(),
                    },
                )

                await session.commit()

                row = result.mappings().one()

            return Goal.model_validate(
                row
            )

        except Exception as exc:
            raise GoalTrackerError(
                "Goal creation failed."
            ) from exc

    async def get(
        self,
        goal_id: UUID,
        user_id: UUID,
    ) -> Optional[Goal]:
        try:
            query = text(
                """
                SELECT *
                FROM goals
                WHERE id=:goal_id
                AND user_id=:user_id
                LIMIT 1
                """
            )

            async with db() as session:
                result = await session.execute(
                    query,
                    {
                        "goal_id": goal_id,
                        "user_id": user_id,
                    },
                )

                row = (
                    result
                    .mappings()
                    .first()
                )

            if not row:
                return None

            return Goal.model_validate(
                row
            )

        except Exception as exc:
            raise GoalTrackerError(
                "Goal lookup failed."
            ) from exc

    async def list_active(
        self,
        user_id: UUID,
    ) -> list[Goal]:
        try:
            query = text(
                """
                SELECT *
                FROM goals
                WHERE user_id=:user_id
                AND status='active'
                ORDER BY priority DESC,
                         created_at DESC
                """
            )

            async with db() as session:
                result = await session.execute(
                    query,
                    {
                        "user_id": user_id,
                    },
                )

                rows = (
                    result
                    .mappings()
                    .all()
                )

            return [
                Goal.model_validate(
                    row
                )
                for row in rows
            ]

        except Exception as exc:
            raise GoalTrackerError(
                "Goal listing failed."
            ) from exc

    async def update(
        self,
        goal_id: UUID,
        update: GoalUpdate,
    ) -> Goal:
        try:
            values = {
                k: v
                for k, v in (
                    update
                    .model_dump(
                        exclude_none=True
                    )
                    .items()
                )
            }

            values[
                "updated_at"
            ] = datetime.utcnow()

            if not values:
                raise GoalTrackerError(
                    "No updates provided."
                )

            set_clause = ", ".join(
                f"{k}=:{k}"
                for k in values
            )

            query = text(
                f"""
                UPDATE goals
                SET {set_clause}
                WHERE id=:goal_id
                RETURNING *
                """
            )

            values[
                "goal_id"
            ] = goal_id

            async with db() as session:
                result = await session.execute(
                    query,
                    values,
                )

                await session.commit()

                row = (
                    result
                    .mappings()
                    .first()
                )

            if not row:
                raise GoalTrackerError(
                    "Goal not found."
                )

            return Goal.model_validate(
                row
            )

        except Exception as exc:
            if isinstance(
                exc,
                GoalTrackerError,
            ):
                raise

            raise GoalTrackerError(
                "Goal update failed."
            ) from exc

    async def complete(
        self,
        goal_id: UUID,
        user_id: UUID,
    ) -> Goal:
        try:
            query = text(
                """
                UPDATE goals
                SET
                    status='completed',
                    progress_pct=1.0,
                    updated_at=NOW()
                WHERE id=:goal_id
                AND user_id=:user_id
                RETURNING *
                """
            )

            async with db() as session:
                result = await session.execute(
                    query,
                    {
                        "goal_id": goal_id,
                        "user_id": user_id,
                    },
                )

                await session.commit()

                row = (
                    result
                    .mappings()
                    .first()
                )

            if not row:
                raise GoalTrackerError(
                    "Goal not found."
                )

            return Goal.model_validate(
                row
            )

        except Exception as exc:
            raise GoalTrackerError(
                "Goal completion failed."
            ) from exc