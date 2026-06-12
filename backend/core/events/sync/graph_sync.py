import logging
import asyncio
from uuid import UUID
from backend.core.events.event_types import DomainEvent, EventType
from backend.core.events.event_publisher import publish_event
from backend.models.memory import Memory, MemoryType
from backend.core.long_term_memory.graph.entities import delete_memory_graph, update_memory_graph
from backend.core.long_term_memory.indexing.qdrant import delete_memory, upsert_memory

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
BASE_RETRY_DELAY = 1.0  # seconds
MAX_RETRY_DELAY = 10.0  # seconds

async def _with_retry(coro, operation_name: str, event_id: str):
    """Execute a coroutine with exponential backoff retry."""
    last_exception = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return await coro
        except Exception as e:
            last_exception = e
            if attempt < MAX_RETRIES:
                delay = min(BASE_RETRY_DELAY * (2 ** attempt), MAX_RETRY_DELAY)
                logger.warning(f"{operation_name} failed (attempt {attempt + 1}/{MAX_RETRIES + 1}): {e}. Retrying in {delay:.1f}s...")
                await asyncio.sleep(delay)
            else:
                logger.error(f"{operation_name} failed after {MAX_RETRIES + 1} attempts for event {event_id}: {e}")
    raise last_exception

async def handle_graph_sync(event: DomainEvent):
    if event.type not in [EventType.MemoryCreated, EventType.MemoryUpdated, EventType.MemoryDeleted]:
        return
        
    async def _do_graph_sync():
        memory_data = event.payload.get("memory")
        if not memory_data:
            logger.error("No memory data in payload for graph sync, event=%s", event.event_id)
            return

        try:
            memory = Memory.model_validate(memory_data)
        except Exception as e:
            logger.error(
                "Failed to deserialize memory for graph sync: %s. "
                "event=%s, payload_keys=%s",
                e, event.event_id, list(memory_data.keys()),
                exc_info=True,
            )
            return

        if event.type == EventType.MemoryDeleted:
            await delete_memory(str(memory.id))
            await delete_memory_graph(memory.id, memory.user_id)
        else:
            await upsert_memory(memory)
            if event.type == EventType.MemoryUpdated:
                await delete_memory_graph(memory.id, memory.user_id)
            await update_memory_graph(memory)
        
        # Publish downstream event
        await publish_event(DomainEvent(
            type=EventType.GraphUpdated,
            user_id=event.user_id,
            payload={"memory_id": str(memory.id)}
        ))
        
        logger.info(f"Graph sync completed for memory {memory.id}")
    
    try:
        await _with_retry(_do_graph_sync(), "Graph sync", event.event_id)
    except Exception as e:
        logger.error(f"Graph sync permanently failed for event {event.event_id}: {e}", exc_info=True)
        raise  # Re-raise for DLQ wrapper in event_router.py
