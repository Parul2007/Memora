import json
import logging
import asyncio
from typing import AsyncGenerator
from backend.db.redis_client import get_redis_client
from backend.core.events.event_types import DomainEvent

logger = logging.getLogger(__name__)

EVENT_CHANNEL = "memora:events"

async def subscribe_to_events() -> AsyncGenerator[DomainEvent, None]:
    """
    Yields a stream of incoming DomainEvents from Redis pub/sub.
    """
    redis = await get_redis_client()
    pubsub = redis.pubsub()
    await pubsub.subscribe(EVENT_CHANNEL)
    logger.info(f"Subscribed to {EVENT_CHANNEL}")
    
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message is not None:
                try:
                    data = json.loads(message["data"])
                    event = DomainEvent(**data)
                    yield event
                except Exception as e:
                    logger.error(f"Failed to parse incoming event: {e}")
            await asyncio.sleep(0.01)
    finally:
        await pubsub.unsubscribe(EVENT_CHANNEL)
        await pubsub.close()
