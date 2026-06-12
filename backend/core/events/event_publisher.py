import json
import logging
from backend.db.redis_client import get_redis_client
from backend.core.events.event_types import DomainEvent

logger = logging.getLogger(__name__)

EVENT_CHANNEL = "memora:events"


class EventPublishError(Exception):
    """Raised when a domain event cannot be published."""

async def publish_event(event: DomainEvent) -> None:
    """
    Publishes a DomainEvent to the central Redis pub/sub channel.
    """
    try:
        redis = await get_redis_client()
        message = event.model_dump_json()
        await redis.publish(EVENT_CHANNEL, message)
        logger.debug(f"Published event {event.type} for user {event.user_id}")
    except Exception as e:
        logger.error(f"Failed to publish event {event.type}: {e}")
        raise EventPublishError(f"Failed to publish event {event.type}: {e}") from e
