"""
backend/core/retrieval_engine/query_analyzer.py

Analyzes user retrieval intent using Mistral-7B via HF Inference API.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Literal

import httpx
from pydantic import BaseModel, Field

from backend.config import settings
from backend.models.memory import MemoryType
from backend.models.message import PerceptionResult


logger = logging.getLogger(__name__)


HF_URL = (
    f"https://router.huggingface.co/hf-inference/models/"
    f"{settings.llm_fast_model_name}"
)

MAX_RETRIES = 3


class QueryAnalyzerError(Exception):
    pass


class QueryAnalysis(BaseModel):
    original_query: str

    search_memory_types: list[MemoryType]

    key_entities: list[str] = Field(
        default_factory=list
    )

    sub_queries: list[str] = Field(
        default_factory=list
    )

    requires_multi_hop: bool = False

    temporal_filter: (
        Literal["recent", "historical"] | None
    ) = None


class QueryAnalyzer:
    async def analyze(
        self,
        query: str,
        perception_result: PerceptionResult,
    ) -> QueryAnalysis:
        try:
            entities = [
                str(e)
                for e in getattr(
                    perception_result,
                    "entities",
                    [],
                )
            ]

            payload = self._build_prompt(
                query=query,
                entities=entities,
            )

            response = await self._call_mistral(
                payload
            )

            parsed = self._parse_response(
                query=query,
                response=response,
            )

            logger.info(
                "Query analysis: types=%s, entities=%s, multi_hop=%s",
                [
                    t.value
                    for t in parsed.search_memory_types
                ],
                parsed.key_entities,
                parsed.requires_multi_hop,
            )

            return parsed

        except Exception:
            logger.exception(
                "query_analysis_failed"
            )

            return self._fallback(
                query=query,
                perception_result=perception_result,
            )

    def _build_prompt(
        self,
        query: str,
        entities: list[str],
    ) -> str:
        return (
            "Analyze this user query for memory retrieval:\n"
            f"Query: {query}\n"
            f"Entities found: {entities}\n"
            "Respond with JSON:\n"
            "{"
            '"search_memory_types": list,'
            '"key_entities": list[str],'
            '"sub_queries": list[str],'
            '"requires_multi_hop": bool,'
            '"temporal_filter": null|"recent"|"historical"'
            "}"
        )

    async def _call_mistral(
        self,
        prompt: str,
    ) -> str:
        headers = {
            "Authorization": (
                f"Bearer {settings.hf_api_token}"
            )
        }

        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 300,
                "temperature": 0.1,
            },
        }

        async with httpx.AsyncClient(
            timeout=45.0,
        ) as client:
            for attempt in range(
                MAX_RETRIES
            ):
                response = await client.post(
                    HF_URL,
                    headers=headers,
                    json=payload,
                )

                if response.status_code == 503:
                    if (
                        attempt
                        < MAX_RETRIES - 1
                    ):
                        await asyncio.sleep(
                            2**attempt
                        )
                        continue

                response.raise_for_status()

                data = response.json()

                if isinstance(
                    data,
                    list,
                ):
                    return (
                        data[0]
                        .get(
                            "generated_text",
                            "",
                        )
                        .strip()
                    )

                if isinstance(
                    data,
                    dict,
                ):
                    return (
                        data.get(
                            "generated_text",
                            ""
                        ).strip()
                    )

        raise QueryAnalyzerError(
            "Inference failed"
        )

    def _parse_response(
        self,
        query: str,
        response: str,
    ) -> QueryAnalysis:
        cleaned = (
            response
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

        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1:
            raise QueryAnalyzerError(
                "No JSON found"
            )

        parsed = json.loads(
            cleaned[
                start : end + 1
            ]
        )

        parsed[
            "original_query"
        ] = query

        parsed[
            "search_memory_types"
        ] = [
            MemoryType(
                value
            )
            for value in parsed.get(
                "search_memory_types",
                [],
            )
        ]

        return QueryAnalysis.model_validate(
            parsed
        )

    def _fallback(
        self,
        query: str,
        perception_result: PerceptionResult,
    ) -> QueryAnalysis:
        return QueryAnalysis(
            original_query=query,
            search_memory_types=[
                MemoryType.EPISODIC,
                MemoryType.SEMANTIC,
                MemoryType.PROCEDURAL,
                MemoryType.EMOTIONAL,
            ],
            key_entities=[
                str(e)
                for e in getattr(
                    perception_result,
                    "entities",
                    [],
                )
            ],
            sub_queries=[],
            requires_multi_hop=False,
            temporal_filter=None,
        )