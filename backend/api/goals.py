"""
backend/api/goals.py

Goal management API.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from pydantic import BaseModel

from backend.dependencies import (
    get_current_user,
)
from backend.core.goal_planning.goal_tracker import (
    Goal,
    GoalCreate,
    GoalTracker,
    GoalUpdate,
)
from backend.core.goal_planning.milestone_engine import (
    MilestoneEngine,
)
from backend.core.goal_planning.habit_analyser import (
    HabitAnalyzer,
)


router = APIRouter(
    prefix="/api/goals",
    tags=["goals"],
)


goal_tracker = GoalTracker()
milestone_engine = (
    MilestoneEngine()
)
habit_analyzer = (
    HabitAnalyzer()
)


class GoalAPIError(
    Exception
):
    pass


class MilestoneCreate(
    BaseModel,
):
    title: str


async def _get_goal(
    goal_id: UUID,
    user_id: UUID,
) -> Goal:
    goal = (
        await goal_tracker.get(
            goal_id=goal_id,
            user_id=user_id,
        )
    )

    if goal is None:
        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    return goal


@router.get(
    "/",
    response_model=list[
        Goal
    ],
)
async def list_goals(
    current_user: UUID = Depends(
        get_current_user
    ),
):
    return (
        await goal_tracker.list_active(
            current_user
        )
    )


@router.post(
    "/",
    response_model=Goal,
)
async def create_goal(
    goal: GoalCreate,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    payload = (
        goal.model_copy(
            update={
                "user_id": current_user
            }
        )
    )

    return await (
        goal_tracker.create(
            payload
        )
    )


@router.get(
    "/{goal_id}",
    response_model=Goal,
)
async def get_goal(
    goal_id: UUID,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    return await _get_goal(
        goal_id,
        current_user,
    )


@router.patch(
    "/{goal_id}",
    response_model=Goal,
)
async def update_goal(
    goal_id: UUID,
    update: GoalUpdate,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    await _get_goal(
        goal_id,
        current_user,
    )

    return await (
        goal_tracker.update(
            goal_id,
            update,
        )
    )


@router.delete(
    "/{goal_id}",
    response_model=Goal,
)
async def abandon_goal(
    goal_id: UUID,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    await _get_goal(
        goal_id,
        current_user,
    )

    return await (
        goal_tracker.update(
            goal_id,
            GoalUpdate(
                status="abandoned"
            ),
        )
    )


@router.post(
    "/{goal_id}/complete",
    response_model=Goal,
)
async def complete_goal(
    goal_id: UUID,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    return await (
        goal_tracker.complete(
            goal_id,
            current_user,
        )
    )


@router.post(
    "/{goal_id}/milestone",
    response_model=Goal,
)
async def add_milestone(
    goal_id: UUID,
    body: MilestoneCreate,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    await _get_goal(
        goal_id,
        current_user,
    )

    return await (
        milestone_engine.add_milestone(
            goal_id=goal_id,
            user_id=current_user,
            title=body.title,
            goal_tracker=goal_tracker,
        )
    )


@router.get(
    "/{goal_id}/habits",
    response_model=Goal,
)
async def get_goal_habits(
    goal_id: UUID,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    goal = await _get_goal(
        goal_id,
        current_user,
    )

    return goal