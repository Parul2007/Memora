"""
tests/memory/test_perception_parser.py

Validates the perception parsing pipeline which orchestrates embedding, entity extraction, and classification.
Production File: backend/core/perception/parser.py
Runtime Path: indexing_worker.py -> parse()
Feature Protected: Memory understanding pipeline and AI categorization.
"""

import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4

from backend.core.perception.parser import parse, PerceptionError
from backend.models.memory import MemoryType

@pytest.fixture
def test_args():
    return {
        "text": "I went to the park.",
        "session_id": uuid4(),
        "user_id": uuid4()
    }

@pytest.mark.asyncio
@patch("backend.core.perception.parser.embed_text", new_callable=AsyncMock)
@patch("backend.core.perception.parser.extract_entities", new_callable=AsyncMock)
@patch("backend.core.perception.parser.classify_memory_type", new_callable=AsyncMock)
async def test_successful_parse(mock_classify, mock_extract, mock_embed, test_args, monkeypatch):
    from backend.config import settings
    monkeypatch.setattr(settings, "embedding_dims", 1024)
    
    mock_embed.return_value = [0.1] * 1024
    mock_extract.return_value = [{"text": "park", "label": "LOCATION"}]
    mock_classify.return_value = (MemoryType.EPISODIC, {MemoryType.EPISODIC.value: 0.95})
    
    result = await parse(**test_args)
    
    assert result.text == test_args["text"]
    assert len(result.embedding) == 1024
    assert len(result.entities) == 1
    assert result.memory_type == MemoryType.EPISODIC
    assert result.classification_scores[MemoryType.EPISODIC.value] == 0.95

@pytest.mark.asyncio
@patch("backend.core.perception.parser.embed_text", new_callable=AsyncMock)
async def test_parse_fails_if_embed_fails(mock_embed, test_args):
    mock_embed.side_effect = Exception("Embedding model offline")
    
    with pytest.raises(PerceptionError) as exc_info:
        await parse(**test_args)
    
    assert "Embedding required for perception" in str(exc_info.value)

@pytest.mark.asyncio
@patch("backend.core.perception.parser.embed_text", new_callable=AsyncMock)
@patch("backend.core.perception.parser.extract_entities", new_callable=AsyncMock)
@patch("backend.core.perception.parser.classify_memory_type", new_callable=AsyncMock)
async def test_parse_degrades_gracefully(mock_classify, mock_extract, mock_embed, test_args, monkeypatch):
    # Entity extraction and classification fail, but embedding succeeds
    from backend.config import settings
    monkeypatch.setattr(settings, "embedding_dims", 1024)
    
    mock_embed.return_value = [0.1] * 1024
    mock_extract.side_effect = Exception("NER model offline")
    mock_classify.side_effect = Exception("Classifier offline")
    
    result = await parse(**test_args)
    
    # Still succeeds but with degraded outputs
    assert len(result.embedding) == 1024
    assert result.entities == []
    assert result.memory_type == MemoryType.EPISODIC  # Default fallback
