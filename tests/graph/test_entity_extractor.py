"""
tests/graph/test_entity_extractor.py

Validates the entity extraction adapter, including Hugging Face API integration
and local regex-based fallback mechanisms.
Production File: backend/core/perception/entity_extractor.py
Runtime Path: parser.py -> extract_entities()
Feature Protected: Knowledge graph generation.
"""

import pytest
from unittest.mock import patch
import httpx

from backend.core.perception.entity_extractor import extract_entities, DEFAULT_LABELS

@pytest.mark.asyncio
async def test_extract_entities_hf_success():
    class MockResponse:
        status_code = 200
        def json(self):
            return [
                {"text": "John", "label": "person", "score": 0.99, "start": 0, "end": 4},
                {"text": "Google", "label": "organization", "score": 0.98, "start": 10, "end": 16}
            ]

    class MockAsyncClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def post(self, *args, **kwargs):
            return MockResponse()

    with patch("backend.core.perception.entity_extractor.httpx.AsyncClient", return_value=MockAsyncClient()):
        result = await extract_entities("John from Google")
        
    assert len(result) == 2
    assert result[0]["text"] == "John"
    assert result[0]["label"] == "person"
    assert result[1]["text"] == "Google"
    assert result[1]["label"] == "organization"

@pytest.mark.asyncio
async def test_extract_entities_fallback_on_hf_failure():
    class MockAsyncClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def post(self, *args, **kwargs):
            raise httpx.RequestError("Network error")

    # Using the local fallback for "Parul works at Microsoft"
    # "Parul" should be mapped to person, "Microsoft" to organization
    with patch("backend.core.perception.entity_extractor.httpx.AsyncClient", return_value=MockAsyncClient()):
        result = await extract_entities("Parul works at Microsoft in California")
        
    # The fallback regex matches Capitalized Words.
    # "Parul", "Microsoft", "California"
    texts = [r["text"] for r in result]
    assert "Parul" in texts
    assert "Microsoft" in texts
    assert "California" in texts
    
    # Check specific mappings from the fallback logic
    parul = next(r for r in result if r["text"] == "Parul")
    assert parul["label"] == "person"
    
    msft = next(r for r in result if r["text"] == "Microsoft")
    assert msft["label"] == "organization"
    
    cali = next(r for r in result if r["text"] == "California")
    assert cali["label"] == "place"
