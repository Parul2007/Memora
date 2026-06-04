# models/user.py
# Canonical user profile and persona contract for Memora.
# Shared across API, orchestration, memory systems,
# and personalization pipelines.

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class UserPreferences(BaseModel):
    response_tone: Literal[
        "formal",
        "casual",
        "balanced",
    ] = "balanced"

    verbosity: Literal[
        "concise",
        "medium",
        "detailed",
    ] = "medium"

    memory_enabled: bool = True

    emotional_tracking: bool = True

    topics_of_interest: list[str] = Field(
        default_factory=list,
    )

    timezone: str = "UTC"

    model_config = ConfigDict(
        from_attributes=True,
    )


class UserBase(BaseModel):
    external_id: str = Field(
        min_length=1,
    )

    display_name: str | None = None

    persona_summary: str | None = None

    preferences: UserPreferences = Field(
        default_factory=UserPreferences,
    )

    emotional_baseline: float = Field(
        default=0.0,
        ge=-1.0,
        le=1.0,
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


class UserCreate(UserBase):
    model_config = ConfigDict(
        from_attributes=True,
    )


class User(UserBase):
    id: UUID

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class UserUpdate(BaseModel):
    display_name: str | None = None

    persona_summary: str | None = None

    preferences: UserPreferences | None = None

    emotional_baseline: float | None = Field(
        default=None,
        ge=-1.0,
        le=1.0,
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


class UserContext(BaseModel):
    user: User

    recent_emotional_state: float = Field(
        default=0.0,
        ge=-1.0,
        le=1.0,
    )

    active_goals_count: int = 0

    total_memories_count: int = 0

    persona_keywords: list[str] = Field(
        default_factory=list,
    )

    model_config = ConfigDict(
        from_attributes=True,
    )


__all__ = [
    "UserPreferences",
    "UserBase",
    "UserCreate",
    "User",
    "UserUpdate",
    "UserContext",
]