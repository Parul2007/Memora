"""
backend/core/response_generator/generator.py

Final response generation via Llama-3.1-70B HF Inference API.
"""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncGenerator
from typing import Union

from langchain_huggingface import HuggingFaceEndpoint

from backend.config import settings
from backend.core.working_memory.attention_window import (
    AttentionWindow,
)


logger = logging.getLogger(__name__)


GENERATION_PARAMS = {
    "max_new_tokens": 512,
    "temperature": 0.7,
    "repetition_penalty": 1.1,
}


class ResponseGeneratorError(Exception):
    """Raised when response generation fails."""


from huggingface_hub import AsyncInferenceClient

class ResponseGenerator:
    def __init__(self) -> None:
        self.client = AsyncInferenceClient(api_key=settings.hf_api_token)

    def _format_prompt(
        self,
        query: str,
        attention_window: AttentionWindow,
        system_prompt: str,
        reasoning_trace: str,
    ) -> str:
        """Format the system prompt and conversation context into Llama-3 instruction format."""
        return (
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            f"{system_prompt}<|eot_id|>\n"
            "<|start_header_id|>user<|end_header_id|>\n\n"
            f"{attention_window.formatted_context}\n\n"
            f"Reasoning:\n{reasoning_trace}\n\n"
            f"User: {query}<|eot_id|>\n"
            "<|start_header_id|>assistant<|end_header_id|>\n\n"
        )

    async def generate(
        self,
        query: str,
        attention_window: AttentionWindow,
        system_prompt: str,
        reasoning_trace: str,
        stream: bool = False,
    ) -> Union[
        str,
        AsyncGenerator[
            str,
            None,
        ],
    ]:
        if stream:
            return self._stream(query, attention_window, system_prompt, reasoning_trace)

        return await self._generate(query, attention_window, system_prompt, reasoning_trace)

    async def _generate(
        self,
        query: str,
        attention_window: AttentionWindow,
        system_prompt: str,
        reasoning_trace: str,
    ) -> str:
        started = time.perf_counter()

        for attempt in range(3):
            try:
                res = await self.client.chat_completion(
                    model=settings.llm_model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"{attention_window.formatted_context}\n\nReasoning:\n{reasoning_trace}\n\nUser: {query}"}
                    ],
                    max_tokens=GENERATION_PARAMS["max_new_tokens"],
                    temperature=GENERATION_PARAMS["temperature"],
                )
                text = res.choices[0].message.content
                duration = time.perf_counter() - started

                logger.info(
                    "Response generated: %s chars in %sms",
                    len(text),
                    round(duration * 1000),
                )

                return text

            except Exception as exc:
                if attempt < 2 and any(e in str(exc) for e in ["502", "503", "504", "Gateway", "timeout"]):
                    import asyncio
                    await asyncio.sleep(2)
                    continue
                raise ResponseGeneratorError(
                    f"Generation failed for query length: {len(query)}"
                ) from exc

    async def _stream(
        self,
        query: str,
        attention_window: AttentionWindow,
        system_prompt: str,
        reasoning_trace: str,
    ) -> AsyncGenerator[
        str,
        None,
    ]:
        started = time.perf_counter()
        produced = 0

        for attempt in range(3):
            try:
                stream = await self.client.chat_completion(
                    model=settings.llm_model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"{attention_window.formatted_context}\n\nReasoning:\n{reasoning_trace}\n\nUser: {query}"}
                    ],
                    max_tokens=GENERATION_PARAMS["max_new_tokens"],
                    temperature=GENERATION_PARAMS["temperature"],
                    stream=True,
                )
                async for chunk in stream:
                    if chunk.choices and len(chunk.choices) > 0:
                        content = chunk.choices[0].delta.content
                        if content:
                            produced += len(content)
                            yield content

                duration = time.perf_counter() - started
                logger.info(
                    "Response generated via stream: %s chars in %sms",
                    produced,
                    round(duration * 1000),
                )
                return

            except Exception as exc:
                if attempt < 2 and any(e in str(exc) for e in ["502", "503", "504", "Gateway", "timeout"]):
                    import asyncio
                    await asyncio.sleep(2)
                    continue
                raise ResponseGeneratorError(
                    f"Streaming generation failed for query length: {len(query)}"
                ) from exc

    async def generate_title(self, first_message: str) -> str:
        """Generate a short, descriptive title from the first user message."""
        try:
            res = await self.client.chat_completion(
                model=settings.llm_model_name,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful assistant that generates very short, descriptive titles. "
                            "Generate a title of 2-5 words for a conversation that starts with the given message. "
                            "Respond with ONLY the title, no quotes, no punctuation at the end."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Generate a short title for this message: {first_message[:200]}",
                    },
                ],
                max_tokens=20,
                temperature=0.3,
            )
            title = res.choices[0].message.content.strip().strip('"').strip("'")
            # Limit to 60 chars as a safety measure
            return title[:60] if title else "New Conversation"
        except Exception:
            logger.exception("title_generation_failed")
            # Fallback: use first ~40 chars of user message
            return first_message[:40].strip() + ("..." if len(first_message) > 40 else "")

    async def generate_summary(self, transcript: str) -> str:
        """Generate a 2-sentence summary of the session transcript."""
        try:
            res = await self.client.chat_completion(
                model=settings.llm_model_name,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Summarize the following chat transcript in exactly 2 short sentences. "
                            "Focus on the main topics discussed and any key conclusions."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Transcript:\n{transcript[-4000:]}", # Last ~1000 words
                    },
                ],
                max_tokens=100,
                temperature=0.3,
            )
            summary = res.choices[0].message.content.strip()
            return summary
        except Exception:
            logger.exception("summary_generation_failed")
            return "Summary unavailable."
