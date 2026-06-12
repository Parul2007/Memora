"""
backend/core/reasoning_engine/chain_of_thought.py

Multi-step reasoning over retrieved context using Mistral-7B.
"""

from __future__ import annotations

import logging
import time

from langchain_huggingface import HuggingFaceEndpoint

from backend.config import settings
from backend.core.working_memory.attention_window import (
    AttentionWindow,
)


logger = logging.getLogger(__name__)


MAX_REASONING_CHARS = 500
MAX_TOKENS = 300


class ChainOfThoughtError(Exception):
    """Raised when reasoning generation fails."""


from huggingface_hub import AsyncInferenceClient

class ChainOfThought:
    def __init__(self) -> None:
        self.client = AsyncInferenceClient(api_key=settings.hf_api_token)

    async def reason(
        self,
        query: str,
        attention_window: AttentionWindow,
    ) -> str:
        start = time.perf_counter()

        try:
            context = getattr(
                attention_window,
                "formatted_context",
                "",
            )

            prompt = (
                "Given what you know about the user:\n"
                f"{context}\n\n"
                f"User asks: {query}\n\n"
                "Think step by step: "
                "What do you know that's relevant? "
                "What can you infer? "
                "What should you say?\n"
                "Reasoning:"
            )

            res = await self.client.chat_completion(
                model=settings.llm_model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=MAX_TOKENS,
                temperature=0.2,
            )
            trace = res.choices[0].message.content

            trace = (
                trace.strip()
                [:MAX_REASONING_CHARS]
            )

            duration = (
                time.perf_counter()
                - start
            )

            logger.info(
                "reasoning_complete",
                extra={
                    "trace_length": len(trace),
                    "duration_seconds": round(
                        duration,
                        3,
                    ),
                },
            )

            return (
                trace
                or "No reasoning trace available."
            )

        except Exception as exc:
            status = getattr(exc, "status", None)
            is_auth_error = status in (401, 403) or any(err in str(exc) for err in ("401", "403", "Unauthorized", "Forbidden", "gated"))
            if is_auth_error:
                logger.error(
                    "Hugging Face API returned 401/403 (Unauthorized/Forbidden) during reasoning generation. "
                    "This usually means the configured model requires gated access, or the HF_API_TOKEN is invalid/lacks permissions.\n"
                    "Model: %s\n"
                    "To resolve this, please either:\n"
                    "1. Request and accept model license terms at: https://huggingface.co/%s\n"
                    "   And ensure your HF_API_TOKEN has 'Read' permission.\n"
                    "2. Switch to an open-access equivalent model (e.g. Qwen/Qwen2.5-72B-Instruct) in your .env.",
                    settings.llm_model_name,
                    settings.llm_model_name
                )
            duration = (
                time.perf_counter()
                - start
            )

            logger.exception(
                "reasoning_failed",
                extra={
                    "duration_seconds": round(
                        duration,
                        3,
                    )
                },
            )

            return (
                "No reasoning trace available."
            )