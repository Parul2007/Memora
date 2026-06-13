"""
tests/integration/test_pipeline_integration.py

Validates the full cognitive ingestion pipeline from raw text to database write to event pub.
Production File: backend/workers/indexing_worker.py
Runtime Path: Celery worker pulling message -> parsing -> ingestion -> event bus
Feature Protected: End-to-end cognitive pipeline.
"""

import pytest
import json
from uuid import uuid4
from unittest.mock import AsyncMock, patch, MagicMock

from backend.workers.indexing_worker import _async_index_memory
from backend.models.message import PerceptionResult
from backend.models.memory import MemoryType

@pytest.fixture
def raw_payload():
    return {
        "user_id": str(uuid4()),
        "session_id": str(uuid4()),
        "content": "I love playing tennis on weekends."
    }

@pytest.mark.asyncio
@patch("sqlalchemy.ext.asyncio.create_async_engine")
@patch("sqlalchemy.ext.asyncio.async_sessionmaker")
@patch("backend.core.perception.parser.parse")
@patch("backend.core.long_term_memory.ingestion.gateway.MemoryIngestionGateway")
async def test_end_to_end_cognitive_pipeline(
    mock_gateway_class, mock_parse, mock_sessionmaker, mock_engine, raw_payload
):
    # 1. Mock DB Engine
    mock_engine_instance = AsyncMock()
    mock_engine.return_value = mock_engine_instance
    
    # 2. Mock Parsing (Simulate AI categorizing as Episodic memory)
    mock_perception = PerceptionResult(
        text=raw_payload["content"],
        embedding=[0.5] * 1024,
        entities=[{"text": "tennis"}, {"text": "weekends"}],
        memory_type=MemoryType.EPISODIC,
        classification_scores={}
    )
    mock_parse.return_value = mock_perception
    
    # 3. Mock Gateway Ingestion (Simulate successful write to postgres/neo4j and event publication)
    mock_gateway_instance = AsyncMock()
    
    class MockMemory:
        id = uuid4()
    
    mock_gateway_instance.ingest.return_value = MockMemory()
    mock_gateway_class.return_value = mock_gateway_instance
    
    # Run the worker pipeline
    payload_json = json.dumps(raw_payload)
    result = await _async_index_memory(payload_json)
    
    # Assertions
    assert result["status"] == "ok"
    assert "memory_id" in result
    
    # Validate Flow
    
    # A. Ensure Parser was called
    mock_parse.assert_called_once()
    kwargs = mock_parse.call_args[1]
    assert kwargs["text"] == raw_payload["content"]
    assert str(kwargs["user_id"]) == raw_payload["user_id"]
    
    # B. Ensure Gateway Ingest was called with proper MemoryCreate from the Perception output
    mock_gateway_instance.ingest.assert_called_once()
    memory_create_arg = mock_gateway_instance.ingest.call_args[0][0]
    
    assert str(memory_create_arg.user_id) == raw_payload["user_id"]
    assert memory_create_arg.content == raw_payload["content"]
    assert memory_create_arg.memory_type == MemoryType.EPISODIC
    assert len(memory_create_arg.embedding) == 1024
    assert memory_create_arg.entities == ["tennis", "weekends"]
    
    # C. Ensure engine cleanup
    mock_engine_instance.dispose.assert_called_once()

@pytest.mark.asyncio
async def test_malformed_payload_rejected():
    result = await _async_index_memory("not valid json")
    assert result["status"] == "malformed"
    assert "Invalid JSON string" in result["message"]
