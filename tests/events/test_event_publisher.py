"""
tests/events/test_event_publisher.py

Validates the Redis-backed event publisher.
Production File: backend/core/events/event_publisher.py
Runtime Path: Memory gateway -> publish_event()
Feature Protected: Redis-backed event architecture.
"""

import pytest
import json
from unittest.mock import AsyncMock, patch

from backend.core.events.event_types import DomainEvent, EventType
from backend.core.events.event_publisher import publish_event, EVENT_CHANNEL, EventPublishError

@pytest.mark.asyncio
@patch("backend.core.events.event_publisher.get_redis_client")
async def test_publish_event_success(mock_get_redis):
    mock_redis = AsyncMock()
    mock_get_redis.return_value = mock_redis
    
    event = DomainEvent(
        type=EventType.MemoryCreated,
        user_id="user-123",
        payload={"memory_id": "test-id"}
    )
    
    await publish_event(event)
    
    mock_redis.publish.assert_called_once()
    
    # Verify the channel and payload
    args, kwargs = mock_redis.publish.call_args
    channel, message = args
    
    assert channel == EVENT_CHANNEL
    
    # Ensure payload structure is correct JSON
    parsed_msg = json.loads(message)
    assert parsed_msg["type"] == EventType.MemoryCreated.value
    assert parsed_msg["user_id"] == "user-123"
    assert parsed_msg["payload"]["memory_id"] == "test-id"

@pytest.mark.asyncio
@patch("backend.core.events.event_publisher.get_redis_client")
async def test_publish_event_failure(mock_get_redis):
    mock_redis = AsyncMock()
    mock_redis.publish.side_effect = Exception("Redis connection lost")
    mock_get_redis.return_value = mock_redis
    
    event = DomainEvent(
        type=EventType.MemoryCreated,
        user_id="user-123",
        payload={}
    )
    
    with pytest.raises(EventPublishError) as exc_info:
        await publish_event(event)
        
    assert "Failed to publish event" in str(exc_info.value)
    assert "Redis connection lost" in str(exc_info.value)
