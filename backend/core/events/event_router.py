import logging
import asyncio
import json
import time
import traceback as tb_module
from backend.core.events.event_subscriber import subscribe_to_events
from backend.core.events.event_types import EventType
from backend.core.events.sync.graph_sync import handle_graph_sync

from backend.db.redis_client import get_redis_client
from backend.core.events.dead_letter_queue import DeadLetterQueue

logger = logging.getLogger(__name__)

# Maximum number of individual event processing failures before the outer router
# restarts the subscription. Individual failures are caught and pushed to the
# dead-letter queue — this counter tracks unexpected subscription-level crashes.
MAX_CONSECUTIVE_CRASHES = 5


async def _handle_with_dlq(handler, event, handler_name: str) -> None:
    """
    Execute a sync handler with dead-letter queue protection.

    If the handler raises an exception after all retries, the event is stored
    in the Redis-backed dead-letter queue with full context (error, traceback,
    retry count) for later debugging and replay.
    """
    try:
        await handler(event)
    except Exception as e:
        logger.error(
            "%s failed for event %s: %s",
            handler_name, event.event_id, e, exc_info=True,
        )
        # Store in dead-letter queue for later replay
        try:
            redis = await get_redis_client()
            dlq = DeadLetterQueue(redis)
            tb_str = tb_module.format_exc()
            await dlq.store(
                event=event,
                handler_name=handler_name,
                error=str(e),
                tb=tb_str,
                retry_count=3,
            )
        except Exception as dlq_err:
            logger.error(
                "DLQ: Failed to store event %s from %s: %s",
                event.event_id, handler_name, dlq_err,
            )


async def start_event_router():
    """
    Background task that routes incoming Redis events to the correct sync pipelines.
    
    Execution order (enforces dependencies):
    1. Graph sync - must complete first (intelligence depends on graph)
    2. Intelligence sync - depends on GraphUpdated
    3. Evolution sync + Predictive sync - depend on IntelligenceUpdated
    
    IMPORTANT: Each handler call is wrapped with dead-letter queue protection.
    Failures are stored in Redis DLQ for replay. The outer loop restarts the
    subscription if it crashes unexpectedly (not from a handler failure, but
    from a Redis/subscription-level error).
    
    Without this, a single crash kills ALL SSE connections and stops event
    processing permanently.
    """
    logger.info("Starting central event router...")
    consecutive_crashes = 0

    while True:
        try:
            async for event in subscribe_to_events():
                consecutive_crashes = 0  # Reset on successful event receipt
                logger.debug(f"Routing event: {event.type}")
                
                # Each handler is individually wrapped with DLQ protection.
                # If one handler fails, others still process the event.
                
                # Step 1: Graph sync MUST complete first (intelligence depends on graph state)
                await _handle_with_dlq(handle_graph_sync, event, "graph_sync")
                

                
        except asyncio.CancelledError:
            logger.info("Event router stopped.")
            break
        except Exception as e:
            consecutive_crashes += 1
            logger.error(
                "Event router crashed (attempt %d/%d): %s",
                consecutive_crashes, MAX_CONSECUTIVE_CRASHES, e,
                exc_info=True,
            )
            if consecutive_crashes >= MAX_CONSECUTIVE_CRASHES:
                logger.critical(
                    "Event router exceeded max consecutive crashes (%d). "
                    "Giving up. Manual restart required.",
                    MAX_CONSECUTIVE_CRASHES,
                )
                break
            logger.info("Restarting event router in 2 seconds (%d/%d)...",
                        consecutive_crashes, MAX_CONSECUTIVE_CRASHES)
            await asyncio.sleep(2)