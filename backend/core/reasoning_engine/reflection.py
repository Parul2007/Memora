"""
backend/core/reasoning_engine/reflection.py

Fast heuristic reflection for response quality evaluation.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from pydantic import BaseModel, Field

from backend.models.memory import Memory


logger = logging.getLogger(__name__)


HALLUCINATION_MARKERS = (
    "i believe",
    "i think",
    "probably",
)

TOKEN_PATTERN = re.compile(r"\b\w+\b")


class ReflectionResult(BaseModel):
    is_grounded: bool

    quality_score: float = Field(
        ge=0.0,
        le=1.0,
    )

    issues: list[str]

    suggested_correction: Optional[str] = None


class Reflection:
    async def reflect(
        self,
        response_text: str,
        query: str,
        context_memories: list[Memory],
    ) -> ReflectionResult:
        try:
            if not context_memories:
                return ReflectionResult(
                    is_grounded=True,
                    quality_score=0.8,
                    issues=[],
                    suggested_correction=None,
                )

            overlaps = []

            for memory in context_memories:
                content = getattr(
                    memory,
                    "content",
                    "",
                )

                overlaps.append(
                    self._keyword_overlap(
                        response_text,
                        content,
                    )
                )

            max_overlap = (
                max(overlaps)
                if overlaps
                else 0.0
            )

            is_grounded = (
                max_overlap >= 0.10
            )

            issues: list[str] = []

            response_lower = (
                response_text.lower()
            )

            has_uncertain_language = any(
                marker
                in response_lower
                for marker in HALLUCINATION_MARKERS
            )

            has_high_overlap = (
                max_overlap >= 0.30
            )

            if (
                has_uncertain_language
                and has_high_overlap
            ):
                issues.append(
                    "Response uses uncertain language despite grounded context."
                )

            if not is_grounded:
                issues.append(
                    "Response appears weakly connected to retrieved memories."
                )

            quality_score = (
                0.5
                + (
                    0.5
                    * float(
                        is_grounded
                    )
                )
            )

            suggestion = (
                "Ground the answer more directly in retrieved memories."
                if issues
                else None
            )

            logger.debug(
                "reflection_complete",
                extra={
                    "quality_score": quality_score,
                    "grounded": is_grounded,
                },
            )

            return ReflectionResult(
                is_grounded=is_grounded,
                quality_score=quality_score,
                issues=issues,
                suggested_correction=suggestion,
            )

        except Exception:
            logger.exception(
                "reflection_failed"
            )

            return ReflectionResult(
                is_grounded=True,
                quality_score=0.8,
                issues=[],
                suggested_correction=None,
            )

    @staticmethod
    def _keyword_overlap(
        text1: str,
        text2: str,
    ) -> float:
        words_1 = set(
            TOKEN_PATTERN.findall(
                text1.lower()
            )
        )

        words_2 = set(
            TOKEN_PATTERN.findall(
                text2.lower()
            )
        )

        if (
            not words_1
            or not words_2
        ):
            return 0.0

        intersection = (
            words_1
            & words_2
        )

        union = (
            words_1
            | words_2
        )

        return (
            len(
                intersection
            )
            / len(
                union
            )
        )