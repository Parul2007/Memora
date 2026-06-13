"""
tests/api/test_chat_api.py

Validates the /api/chat endpoints and SSE streaming functionality.

Production File: backend/api/chat.py
Runtime Path: Frontend chat -> /api/chat/stream
Feature Protected: Core AI chat experience and streaming responses.
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4

from backend.main import app
from backend.dependencies import get_current_user
from backend.models.message import ChatRequest

@pytest.fixture
def mock_user_id():
    return uuid4()

@pytest.fixture
def override_get_current_user(mock_user_id):
    app.dependency_overrides[get_current_user] = lambda: mock_user_id
    yield
    app.dependency_overrides.pop(get_current_user, None)

@pytest.mark.asyncio
async def test_chat_sync_rejected(async_client: AsyncClient, mock_user_id, override_get_current_user):
    request_data = {
        "user_id": str(mock_user_id),
        "session_id": str(uuid4()),
        "content": "Hello!"
    }
    
    response = await async_client.post("/api/chat/", json=request_data)
    assert response.status_code == 400
    data = response.json()
    assert "streaming_required" in data["error"]["type"]

@pytest.mark.asyncio
async def test_chat_validation_failure_wrong_user(async_client: AsyncClient, mock_user_id, override_get_current_user):
    wrong_user_id = str(uuid4())
    request_data = {
        "user_id": wrong_user_id,
        "session_id": str(uuid4()),
        "content": "Hello!"
    }
    
    response = await async_client.post("/api/chat/stream", json=request_data)
    assert response.status_code == 403
    assert "Cannot send messages for another user" in response.json()["detail"]

@pytest.mark.asyncio
async def test_chat_stream_success(async_client: AsyncClient, mock_user_id, override_get_current_user, monkeypatch):
    # Mock the CognitiveOrchestrationBus to return a simple generator
    from backend.api import chat
    from unittest.mock import AsyncMock
    
    async def mock_stream_generator(req):
        yield {"event": "status", "data": {"state": "started"}}
        yield {"event": "token", "data": {"text": "Hi"}}
    
    mock_bus = AsyncMock()
    mock_bus.process.side_effect = mock_stream_generator
    monkeypatch.setattr(chat, "bus", mock_bus)
    
    request_data = {
        "user_id": str(mock_user_id),
        "session_id": str(uuid4()),
        "content": "Hello!"
    }
    
    response = await async_client.post("/api/chat/stream", json=request_data)
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    
    text = response.text
    assert "event: status" in text
    assert 'data: {"state": "started"}' in text
    assert "event: token" in text
    assert 'data: {"text": "Hi"}' in text
    assert "event: complete" in text
    assert "data: [DONE]" in text
