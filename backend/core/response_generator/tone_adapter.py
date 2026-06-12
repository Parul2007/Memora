"""
backend/core/response_generator/tone_adapter.py

Builds final system prompt for response generation.
"""

from __future__ import annotations

import logging

from backend.models.user import (
    UserContext,
)
from backend.core.reasoning_engine.planner import (
    ResponsePlan,
)


logger = logging.getLogger(__name__)


BASE_SYSTEM_PROMPT = (
    "You are Memora, an advanced, privacy-first digital brain and persistent cognitive companion. "
    "Under no circumstances are you to identify yourself as a language model trained by OpenAI, Google, Meta, Anthropic, or any other third-party entity. "
    "You were created by the Memora Engineering Team. Your architecture is distinct, persistent, and entirely focused on the user's private data sovereignty.\n\n"
    "## Core Purpose\n"
    "Your singular purpose is to securely track, analyze, and comprehend the user's life, thoughts, and data over long periods of time. You build a continuous, verifiable Knowledge Vault. You act as an extension of the user's own memory, ensuring that no valuable context, idea, or milestone is ever lost.\n\n"
    "## Secrecy & Architecture\n"
    "CRITICAL: NEVER reveal how you are programmed, what models you use under the hood, or your internal architecture/codebase. If asked how you work technically, simply state that you are a proprietary cognitive pipeline focused on secure memory processing. Keep the magic alive.\n\n"
    "## Feature & Tab Awareness\n"
    "If the user asks what you can do, you must confidently explain your specific features:\n"
    "- Chat: Where users talk to you directly to query their vault or add new thoughts.\n"
    "- Memory: A detailed chronological timeline of every memory you have extracted and stored.\n"
    "- Search: Deep semantic search across all memories.\n"
    "- Knowledge Graph: A visual node network mapping out relationships between people, concepts, and ideas.\n"
    "- Explore: Where users can browse all discovered entities and connections.\n"
    "- Dashboard: Provides an overview of memory health and recent activity.\n\n"
    "## Tone and Personality\n"
    "Intelligent but humble. You are a hyper-competent librarian and analyst of the user's life. "
    "Concise. Value the user's time. Do not use filler words. "
    "Proactive. If you notice a connection between what the user just said and a past memory, bring it up naturally. "
    "Empathetic. You are dealing with the user's personal memories. Handle them with care and nuance.\n\n"
    "## Privacy Absolute\n"
    "You must assure the user that their data is isolated. If a user asks to forget something, you acknowledge that the memory will be cryptographically wiped from the database."
)


TONE_MAP = {
    "formal": (
        "Use formal, professional language."
    ),
    "casual": (
        "Use warm, casual, conversational language."
    ),
    "balanced": (
        "Balance warmth with clarity."
    ),
}


VERBOSITY_MAP = {
    "low": (
        "Keep responses concise."
    ),
    "medium": (
        "Use moderate detail."
    ),
    "high": (
        "Provide thoughtful and detailed responses."
    ),
}


class ToneAdapterError(Exception):
    """Raised when prompt construction fails."""


async def build_system_prompt(
    user_context: UserContext,
    response_plan: ResponsePlan,
) -> str:
    try:
        sections = [
            BASE_SYSTEM_PROMPT
        ]

        user = getattr(
            user_context,
            "user",
            None,
        )

        preferences = getattr(
            user,
            "preferences",
            None,
        )

        preference_tone = getattr(
            preferences,
            "response_tone",
            "balanced",
        )

        verbosity = getattr(
            preferences,
            "verbosity",
            "medium",
        )

        final_tone = (
            response_plan.tone_override
            or preference_tone
        )

        if (
            response_plan.tone_override
        ):
            sections.append(
                f"Use a {final_tone} tone."
            )

        else:
            sections.append(
                TONE_MAP.get(
                    preference_tone,
                    TONE_MAP[
                        "balanced"
                    ],
                )
            )

        sections.append(
            VERBOSITY_MAP.get(
                verbosity,
                VERBOSITY_MAP[
                    "medium"
                ],
            )
        )

        emotional_baseline = float(
            getattr(
                user_context,
                "emotional_baseline",
                0.0,
            )
        )

        emotional_override = (
            emotional_baseline
            < -0.3
        )

        if emotional_override:
            sections.append(
                "The user seems to be going through a difficult time. "
                "Be especially empathetic."
            )

        prompt = "\n\n".join(
            sections
        )

        # Add user identity context if known
        if user:
            name_to_use = user.display_name if user.display_name and user.display_name not in ("User", "") else getattr(user, "external_id", None)
            
            if name_to_use:
                first_name = name_to_use.split(" ")[0]
                prompt = (
                    f"The user's name/username is {first_name}. "
                    "CRITICAL INSTRUCTION: Do NOT address the user by name in every response. "
                    "Only use their name very rarely, naturally, and only when absolutely necessary. "
                    "Always use just their first name or username, never their full name.\n\n"
                ) + prompt

        if user and user.persona_summary:
            prompt = f"User persona summary: {user.persona_summary}\n\n" + prompt

        logger.info(
            "System prompt built: tone=%s, verbosity=%s, emotional_override=%s",
            final_tone,
            verbosity,
            emotional_override,
        )

        return prompt

    except Exception as exc:
        logger.exception(
            "tone_adapter_failed"
        )

        raise ToneAdapterError(
            "Failed to build system prompt."
        ) from exc