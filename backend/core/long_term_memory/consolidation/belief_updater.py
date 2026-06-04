# core/long_term_memory/consolidation/belief_updater.py
# Resolves contradictory semantic beliefs using Mistral-7B via HF Inference API.
# Runs only during consolidation and updates semantic memory state.

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import httpx

from backend.config import settings

from backend.models.memory import (
    MemoryUpdate,
)

from backend.core.long_term_memory.consolidation.contradiction_detector import (
    ContradictionPair,
)

from backend.core.long_term_memory.stores.semantic_store import (
    SemanticStore,
)


logger = logging.getLogger(__name__)

HF_ENDPOINT = (
    "https://router.huggingface.co/hf-inference/models/"
    "mistralai/Mistral-7B-Instruct-v0.3"
)

MAX_RETRIES = 3


class BeliefUpdaterError(Exception):
    """Raised for contradiction resolution failures."""


@dataclass(slots=True)
class BeliefUpdateResult:
    winner_id: UUID
    loser_id: UUID

    action: str

    new_content: Optional[str]

    rationale: str


def _strip_json(
    content: str,
) -> dict:

    content = re.sub(
        r"^```(?:json)?|```$",
        "",
        content.strip(),
        flags=re.MULTILINE,
    ).strip()

    return json.loads(
        content
    )


async def _call_model(
    prompt: str,
) -> dict:

    headers = {
        "Authorization":
            f"Bearer {settings.hf_api_token}",
    }

    payload = {
        "inputs":
            prompt,
        "parameters": {
            "max_new_tokens":
                256,
            "temperature":
                0.1,
        },
    }

    async with (
        httpx.AsyncClient(
            timeout=90,
        )
        as client
    ):

        for attempt in range(
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
                continue

            response.raise_for_status()

            data = (
                response.json()
            )

            generated = (
                data[0]
                .get(
                    "generated_text",
                    "",
                )
            )

            return _strip_json(
                generated
            )

    raise (
        BeliefUpdaterError(
            "HF retries exhausted"
        )
    )


async def _expire(
    memory_id: UUID,
    store: SemanticStore,
) -> None:

    await store.update_belief(
        memory_id,
        MemoryUpdate(
            metadata={
                "expired":
                    True,
                "expired_at":
                    datetime.now(
                        timezone.utc
                    ).isoformat(),
            },
        ),
    )


async def _consolidate(
    memory_id: UUID,
    content: str | None,
    store: SemanticStore,
) -> None:

    await store.update_belief(
        memory_id,
        MemoryUpdate(
            content=content,
            metadata={
                "consolidated":
                    True,
            },
        ),
    )


async def resolve_contradictions(
    pairs: list[
        ContradictionPair
    ],
    semantic_store: SemanticStore,
) -> list[
    BeliefUpdateResult
]:
    """
    Resolve contradictions
    using Mistral-7B.
    """

    results = []

    for pair in pairs:

        try:

            prompt = (
                "Given two conflicting memories:\n"
                f"A: {pair.memory_a.content}\n"
                f"B: {pair.memory_b.content}\n"
                "Which is more likely true, "
                "or should they be merged?\n"
                "Respond ONLY JSON:\n"
                "{"
                "\"action\":"
                "\"keep_a|keep_b|merge\","
                "\"rationale\":"
                "\"...\","
                "\"merged_content\":"
                "null"
                "}"
            )

            decision = (
                await _call_model(
                    prompt
                )
            )

            action = (
                decision
                .get(
                    "action",
                    "",
                )
                .lower()
            )

            rationale = (
                decision
                .get(
                    "rationale",
                    "",
                )
            )

            merged = (
                decision
                .get(
                    "merged_content"
                )
            )

            winner = (
                pair.memory_a.id
            )

            loser = (
                pair.memory_b.id
            )



            if (
                action
                ==
                "keep_b"
            ):

                winner = (
                    pair.memory_b.id
                )

                loser = (
                    pair.memory_a.id
                )

                await _expire(
                    loser,
                    semantic_store,
                )

                await _consolidate(
                    winner,
                    None,
                    semantic_store,
                )

                final_action = (
                    "kept_b"
                )


            elif (
                action
                ==
                "merge"
            ):

                await semantic_store.update_belief(
                    pair.memory_a.id,
                    MemoryUpdate(
                        content=merged,
                        metadata={
                            "merged":
                                True,
                        },
                    ),
                )

                await _expire(
                    pair.memory_b.id,
                    semantic_store,
                )

                await _consolidate(
                    pair.memory_a.id,
                    merged,
                    semantic_store,
                )

                final_action = (
                    "merged"
                )


            else:

                await _expire(
                    pair.memory_b.id,
                    semantic_store,
                )

                await _consolidate(
                    pair.memory_a.id,
                    None,
                    semantic_store,
                )

                final_action = (
                    "kept_a"
                )



            logger.info(
                (
                    "Resolved contradiction: "
                    f"{final_action} "
                    f"for memories "
                    f"{pair.memory_a.id} "
                    f"vs "
                    f"{pair.memory_b.id}"
                )
            )

            results.append(
                BeliefUpdateResult(
                    winner_id=winner,
                    loser_id=loser,
                    action=final_action,
                    new_content=merged,
                    rationale=rationale,
                )
            )

        except Exception as exc:

            raise (
                BeliefUpdaterError(
                    (
                        "Resolution failed: "
                        f"{exc}"
                    )
                )
            ) from exc

    return results


__all__ = [
    "BeliefUpdaterError",
    "BeliefUpdateResult",
    "resolve_contradictions",
]