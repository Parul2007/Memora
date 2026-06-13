"""
tests/memory/test_ingestion_gateway.py

Validates the memory ingestion pipeline.
Production File: backend/core/long_term_memory/ingestion/gateway.py
Runtime Path: indexing_worker.py -> gateway.ingest()
Feature Protected: Persistent memory creation.
"""

import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from backend.core.long_term_memory.ingestion.gateway import MemoryIngestionGateway, IngestionDiscardedError
from backend.models.memory import MemoryCreate, MemoryType, Memory

@pytest.fixture
def memory_create():
    return MemoryCreate(
        user_id=uuid4(),
        content="Test memory",
        memory_type=MemoryType.EPISODIC,
        embedding=[0.1] * 1024,
        entities=["test"]
    )

@pytest.fixture
def mock_memory(memory_create):
    from datetime import datetime, timezone
    return Memory(
        id=uuid4(),
        user_id=memory_create.user_id,
        content=memory_create.content,
        memory_type=memory_create.memory_type,
        entities=memory_create.entities,
        embedding=memory_create.embedding,
        importance_score=0.9,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

@pytest.mark.asyncio
@patch("backend.core.long_term_memory.ingestion.gateway.compute_importance")
@patch("backend.core.long_term_memory.ingestion.gateway.should_store")
@patch("backend.core.long_term_memory.ingestion.gateway.check_duplicate")
@patch("backend.core.long_term_memory.ingestion.gateway.episodic_store.save")
@patch("backend.core.long_term_memory.ingestion.gateway.publish_event")
async def test_successful_ingestion(
    mock_publish, mock_save, mock_dedup, mock_should_store, mock_compute,
    memory_create, mock_memory
):
    mock_compute.return_value = 0.9
    mock_should_store.return_value = True
    mock_dedup.return_value = (False, None)
    mock_save.return_value = mock_memory
    
    gateway = MemoryIngestionGateway()
    result = await gateway.ingest(memory_create)
    
    assert result is not None
    assert result.id == mock_memory.id
    mock_save.assert_called_once_with(memory_create)
    mock_publish.assert_called_once()
    
    event = mock_publish.call_args[0][0]
    assert event.type == "MemoryCreated"
    assert event.user_id == str(mock_memory.user_id)

@pytest.mark.asyncio
@patch("backend.core.long_term_memory.ingestion.gateway.compute_importance")
@patch("backend.core.long_term_memory.ingestion.gateway.should_store")
async def test_discard_below_threshold(mock_should_store, mock_compute, memory_create):
    mock_compute.return_value = 0.1
    mock_should_store.return_value = False
    
    gateway = MemoryIngestionGateway()
    result = await gateway.ingest(memory_create)
    
    assert result is None
