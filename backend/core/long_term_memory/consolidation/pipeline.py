# core/long_term_memory/consolidation/pipeline.py
# Session-end consolidation pipeline.
# Runs inside Celery and transforms episodic memories into durable semantic knowledge.

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from uuid import UUID

import httpx

from backend.config import settings

from backend.models.memory import (
    Memory,
    MemoryCreate,
    MemoryType,
)

from backend.core.long_term_memory.consolidation.contradiction_detector import (
    detect_contradictions,
)

from backend.core.long_term_memory.consolidation.belief_updater import (
    resolve_contradictions,
)

from backend.core.long_term_memory.ingestion.gateway import (
    MemoryIngestionGateway,
)

from backend.core.long_term_memory.stores.episodic_store import (
    episodic_store,
)

from backend.core.long_term_memory.stores.semantic_store import (
    semantic_store,
)

from backend.db.postgres import (
    get_async_session,
)

logger = logging.getLogger(__name__)

HF_ENDPOINT = (
    "https://router.huggingface.co/hf-inference/models/"
    "mistralai/Mistral-7B-Instruct-v0.3"
)

MAX_RETRIES = 3


class ConsolidationError(Exception):
    """Raised for consolidation failures."""


@dataclass(slots=True)
class ConsolidationSummary:
    session_id: UUID
    memories_processed: int
    new_semantic_facts: int
    contradictions_resolved: int
    duration_seconds: float


async def _call_mistral(
    prompt: str,
) -> list[dict]:

    headers = {
        "Authorization":
            f"Bearer {settings.hf_api_token}"
    }

    payload = {
        "inputs":
            prompt,
        "parameters": {
            "temperature":
                0.1,
            "max_new_tokens":
                1024,
        },
    }

    async with (
        httpx.AsyncClient(
            timeout=120,
        )
        as client
    ):

        for _ in range(
            MAX_RETRIES
        ):

            response = (
                await client.post(
                    HF_ENDPOINT,
                    headers=headers,
                    json=payload,
                )
            )

            if (
                response.status_code
                == 503
            ):
                await asyncio.sleep(
                    5
                )
                continue

            response.raise_for_status()

            result = (
                response.json()
            )

            text = (
                result[0]
                .get(
                    "generated_text",
                    ""
                )
                .strip()
            )

            text = (
                text
                .replace(
                    "```json",
                    "",
                )
                .replace(
                    "```",
                    "",
                )
                .strip()
            )

            return json.loads(
                text
            )

    raise ConsolidationError(
        "Mistral unavailable"
    )


async def _load_memories(
    user_id: UUID,
) -> tuple[
    list[Memory],
    list[Memory],
]:

    semantic = (
        await semantic_store
        .get_all_for_user(
            user_id
        )
    )

    episodic = (
        await episodic_store
        .search_by_vector(
            query_embedding=[
                0.0
            ]
            * 1024,
            user_id=user_id,
            top_k=100,
        )
    )

    episodic = [
        m
        for m
        in episodic
        if (
            not m
            .is_consolidated
        )
    ]

    semantic = [
        m
        for m
        in semantic
        if (
            not m
            .is_consolidated
        )
    ]

    return (
        episodic,
        semantic,
    )


async def _mark_session(
    session_id: UUID,
) -> None:

    async with (
        get_async_session()
        as session
    ):

        await session.execute(
            """
            UPDATE sessions
            SET
                is_consolidated=TRUE
            WHERE id=:id
            """,
            {
                "id":
                    session_id
            },
        )

        await session.commit()


async def _mark_memories(
    memories: list[
        Memory
    ],
) -> None:

    async with (
        get_async_session()
        as session
    ):

        for memory in memories:

            await session.execute(
                """
                UPDATE memories
                SET
                    is_consolidated=TRUE
                WHERE id=:id
                """,
                {
                    "id":
                        memory.id
                },
            )

        await session.commit()


class ConsolidationPipeline:

    async def run(
        self,
        session_id: UUID,
        user_id: UUID,
    ) -> ConsolidationSummary:

        started = (
            time.perf_counter()
        )

        logger.info(
            (
                "Starting consolidation "
                f"{session_id}"
            )
        )

        try:

            episodic, semantic = (
                await _load_memories(
                    user_id
                )
            )

            contradictions = (
                await detect_contradictions(
                    semantic
                )
            )

            resolved = (
                await resolve_contradictions(
                    contradictions,
                    semantic_store,
                )
            )

            events = "\n".join(
                (
                    f"- {m.content}"
                    for m
                    in episodic
                )
            )

            prompt = (
                "Based on these conversation events:\n"
                f"{events}\n"
                "Extract 3-5 key facts or beliefs "
                "the user has revealed "
                "about themselves.\n"
                "Return JSON list:\n"
                "[{"
                "\"content\":str,"
                "\"importance\":float,"
                "\"entities\":list[str]"
                "}]"
            )

            extracted = (
                await _call_mistral(
                    prompt
                )
            )

            gateway = (
                MemoryIngestionGateway()
            )

            created = 0

            for fact in extracted:

                try:

                    memory = (
                        MemoryCreate(
                            user_id=user_id,
                            content=fact[
                                "content"
                            ],
                            memory_type=(
                                MemoryType
                                .SEMANTIC
                            ),
                            embedding=[
                                0.0
                            ]
                            * 1024,
                            importance_score=(
                                fact.get(
                                    "importance",
                                    0.7,
                                )
                            ),
                            entities=(
                                fact.get(
                                    "entities",
                                    [],
                                )
                            ),
                        )
                    )

                    saved = (
                        await gateway
                        .ingest(
                            memory
                        )
                    )

                    if saved:
                        created += 1

                except Exception:

                    logger.exception(
                        (
                            "Semantic "
                            "fact ingest "
                            "failed"
                        )
                    )

            await _mark_memories(
                episodic
            )

            await _mark_session(
                session_id
            )

            duration = round(
                (
                    time.perf_counter()
                    - started
                ),
                2,
            )

            logger.info(
                (
                    "Consolidation complete: "
                    f"{len(episodic)} "
                    "episodic → "
                    f"{created} "
                    "semantic facts"
                )
            )

            return (
                ConsolidationSummary(
                    session_id=session_id,
                    memories_processed=(
                        len(
                            episodic
                        )
                        +
                        len(
                            semantic
                        )
                    ),
                    new_semantic_facts=created,
                    contradictions_resolved=(
                        len(
                            resolved
                        )
                    ),
                    duration_seconds=duration,
                )
            )

        except Exception as exc:

            raise (
                ConsolidationError(
                    (
                        "Pipeline failed: "
                        f"{exc}"
                    )
                )
            ) from exc


__all__ = [
    "ConsolidationPipeline",
    "ConsolidationSummary",
    "ConsolidationError",
]