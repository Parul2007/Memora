# core/working_memory/summarizer.py
# Async session summarization adapter for Memora.
# Routes summarization to Hugging Face Serverless Inference API with robust fallback.

from __future__ import annotations

import logging
import time
import httpx

from backend.config import settings
from backend.models.message import (
    Message,
    MessageRole,
)


logger = logging.getLogger(__name__)

MAX_INPUT_CHARS = 3000
MAX_OUTPUT_CHARS = 500
MIN_SUMMARY_LENGTH = 30
HF_URL = f"https://router.huggingface.co/hf-inference/models/{settings.summarizer_model_name}"


class SummarizationError(Exception):
    """Raised when session summarization fails."""


def _ensure_model_loaded() -> None:
    pass


def _role_prefix(
    role: MessageRole,
) -> str:

    if role is MessageRole.USER:
        return "User"

    if role is MessageRole.ASSISTANT:
        return "Assistant"

    return "System"


def _format_messages(
    messages: list[Message],
) -> str:

    lines: list[str] = []

    for message in messages:

        lines.append(
            (
                f"{_role_prefix(message.role)}: "
                f"{message.content}"
            )
        )

    combined = "\n".join(
        lines
    )

    if (
        len(combined)
        > MAX_INPUT_CHARS
    ):
        logger.warning(
            "Summarizer input truncated",
            extra={
                "original_chars":
                    len(
                        combined
                    ),
                "max_chars":
                    MAX_INPUT_CHARS,
            },
        )

        combined = combined[
            :MAX_INPUT_CHARS
        ]

    return combined


def _fallback_summary(messages: list[Message]) -> str:
    """Fall back to listing the first few message interactions if HF is offline."""
    summarized_points = []
    for msg in messages[:3]:
        if msg.role != MessageRole.SYSTEM:
            summarized_points.append(f"{_role_prefix(msg.role)} mentioned: {msg.content[:60]}...")
    return " | ".join(summarized_points) if summarized_points else "Conversation started."


async def summarise_session(
    messages: list[Message],
    max_summary_length: int = 150,
) -> str:
    """
    Compress conversation history into a concise summary.
    """
    if not messages:
        raise ValueError(
            "Cannot summarise empty session"
        )

    text = _format_messages(messages)
    input_chars = len(text)
    started = time.perf_counter()

    try:
        headers = {"Authorization": f"Bearer {settings.hf_api_token}"}
        payload = {
            "inputs": text,
            "parameters": {
                "max_length": max_summary_length,
                "min_length": MIN_SUMMARY_LENGTH,
            },
            "options": {"wait_for_model": True}
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(HF_URL, headers=headers, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                summary = result[0]["summary_text"].strip()
            else:
                logger.warning(
                    f"Summarizer HF API returned status {response.status_code}. Using fallback summary."
                )
                summary = _fallback_summary(messages)
                
    except Exception as exc:
        logger.warning(
            f"Summarizer HF API call failed: {exc}. Using fallback summary."
        )
        summary = _fallback_summary(messages)

    try:
        if len(summary) > MAX_OUTPUT_CHARS:
            logger.warning(
                "Summary truncated",
                extra={"summary_chars": len(summary)},
            )

            summary = summary[:MAX_OUTPUT_CHARS]

        output_chars = len(summary)
        compression = round((output_chars / max(input_chars, 1)), 3)

        logger.info(
            "Session summarised",
            extra={
                "input_chars": input_chars,
                "output_chars": output_chars,
                "compression_ratio": compression,
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            },
        )

        return summary

    except Exception as exc:
        raise SummarizationError(
            f"Session summarization failed: {exc}"
        ) from exc


__all__ = [
    "SummarizationError",
    "summarise_session",
]
