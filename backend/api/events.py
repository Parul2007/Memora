import asyncio
import json
import logging
from uuid import UUID
from fastapi import APIRouter, Request, Depends, Query
from sse_starlette.sse import EventSourceResponse
from backend.core.events.event_subscriber import subscribe_to_events
from backend.dependencies import get_current_user, oauth2_scheme

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/events",
    tags=["Events"],
)

async def get_sse_user(
    token: str | None = Depends(oauth2_scheme),
    token_query: str | None = Query(None, alias="token"),
) -> UUID:
    """Resolve user from Authorization header or query parameter token."""
    actual_token = token or token_query
    return await get_current_user(token=actual_token)

@router.get("/stream")
async def events_stream(
    request: Request,
    current_user: UUID = Depends(get_sse_user),
):
    """
    Server-Sent Events endpoint that forwards Redis pub/sub domain events
    to the frontend for real-time reactive UI updates, authenticated and
    filtered for the current user.
    """
    async def event_generator():
        try:
            # Yield initial connection success
            yield {
                "event": "Connected",
                "data": json.dumps({"status": "ok", "user_id": str(current_user)})
            }
            
            subscriber = subscribe_to_events()
            
            while True:
                if await request.is_disconnected():
                    logger.info("SSE Client disconnected.")
                    break
                
                try:
                    event = await asyncio.wait_for(anext(subscriber), timeout=15.0)
                    
                    # Require user isolation: only yield events belonging to current_user
                    if event.user_id == str(current_user):
                        yield {
                            "event": event.type.value,
                            "data": event.model_dump_json()
                        }
                except asyncio.TimeoutError:
                    # Send a heartbeat every 15s of inactivity to keep connection alive
                    yield {"comment": "keepalive"}
        except asyncio.CancelledError:
            logger.info("SSE stream cancelled.")
            
    return EventSourceResponse(event_generator())

