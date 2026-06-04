"""
backend/api/chat.py

Primary chat API for Memora.
"""

from __future__ import annotations

import time
import logging
from collections.abc import AsyncGenerator
from typing import Optional, Dict, List
from uuid import UUID
import asyncio
import json

from pydantic import BaseModel

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from fastapi.responses import (
    StreamingResponse,
    JSONResponse,
)

from backend.dependencies import (
    get_current_user,
)
from backend.models.message import (
    ChatRequest,
    ChatResponse,
)
from backend.core.orchestration.bus import (
    CognitiveOrchestrationBus,
)
from backend.core.working_memory.session_store import (
    session_store,
)
from backend.workers.consolidation_worker import (
    consolidate_session,
)


router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
)


bus = (
    CognitiveOrchestrationBus()
)


logger = logging.getLogger(__name__)



class ChatAPIError(
    Exception
):
    pass


def _validate_user(
    current_user: UUID,
    request: ChatRequest,
) -> None:
    if (
        request.user_id
        != current_user
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Cannot send messages "
                "for another user."
            ),
        )


@router.post(
    "/",
    response_model=ChatResponse,
)
async def chat(
    chat_request: ChatRequest,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    started = (
        time.perf_counter()
    )

    _validate_user(
        current_user,
        chat_request,
    )

    try:
        print(
            (
                "Chat request: "
                f"user={chat_request.user_id}, "
                f"session={chat_request.session_id}, "
                "stream=False"
            )
        )

        response = (
            await bus.process(
                chat_request
            )
        )

        if (
            hasattr(
                response,
                "__aiter__",
            )
        ):
            raise ChatAPIError(
                (
                    "Streaming response "
                    "returned to sync endpoint."
                )
            )

        response.response_time_ms = (
            int(
                (
                    time.perf_counter()
                    - started
                )
                * 1000
            )
        )

        return response

    except Exception as exc:
        logger.exception("chat_failed", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "message": str(
                        exc
                    ),
                    "type": (
                        "chat_processing_error"
                    ),
                    "response_time_ms": int(
                        (
                            time.perf_counter()
                            - started
                        )
                        * 1000
                    ),
                }
            },
        )


@router.post(
    "/stream",
)
async def chat_stream(
    chat_request: ChatRequest,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    started = (
        time.perf_counter()
    )

    _validate_user(
        current_user,
        chat_request,
    )

    try:
        chat_request.stream = (
            True
        )

        print(
            (
                "Chat request: "
                f"user={chat_request.user_id}, "
                f"session={chat_request.session_id}, "
                "stream=True"
            )
        )

        stream = (
            await bus.process(
                chat_request
            )
        )

        if not hasattr(stream, "__aiter__"):
            raise ValueError(
                f"Expected async stream, got {type(stream)}"
            )

        async def event_stream(
            generator: AsyncGenerator[
                dict,
                None,
            ],
        ):
            try:
                import json
                async for item in generator:
                    if not isinstance(item, dict):
                        # Fallback for plain strings
                        yield f"data: {item}\n\n"
                        continue
                    
                    event = item.get("event", "message")
                    data = item.get("data", "")
                    data_str = data if isinstance(data, str) else json.dumps(data)
                    
                    yield f"event: {event}\ndata: {data_str}\n\n"
            except Exception as e:
                logger.exception("stream_chunk_yield_failed", exc_info=True)
                import json
                yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
            finally:
                yield "event: complete\ndata: [DONE]\n\n"

        return StreamingResponse(
            event_stream(
                stream
            ),
            media_type=(
                "text/event-stream"
            ),
            headers={
                "X-Response-Time-MS": str(
                    int(
                        (
                            time.perf_counter()
                            - started
                        )
                        * 1000
                    )
                )
            },
        )



    except Exception as exc:
        logger.exception("stream_failed", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "message": str(
                        exc
                    ),
                    "type": (
                        "stream_error"
                    ),
                    "response_time_ms": int(
                        (
                            time.perf_counter()
                            - started
                        )
                        * 1000
                    ),
                }
            },
        )

class FeedbackRequest(BaseModel):
    session_id: UUID
    message_id: str
    rating: str  # 'up' or 'down'
    comment: Optional[str] = None

@router.post("/feedback")
async def save_feedback(
    feedback: FeedbackRequest,
    current_user: UUID = Depends(get_current_user),
):
    from backend.db.postgres import get_async_session
    from sqlalchemy import text
    try:
        async for db in get_async_session():
            # Dynamically create table if it doesn't exist
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS message_feedback (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id UUID NOT NULL,
                    message_id VARCHAR(50) NOT NULL,
                    rating VARCHAR(10) NOT NULL,
                    comment TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
                )
            """))
            await db.execute(
                text("""
                    INSERT INTO message_feedback (session_id, message_id, rating, comment)
                    VALUES (:session_id, :message_id, :rating, :comment)
                """),
                {
                    "session_id": feedback.session_id,
                    "message_id": feedback.message_id,
                    "rating": feedback.rating,
                    "comment": feedback.comment,
                }
            )
            await db.commit()
        return {"status": "success"}
    except Exception as e:
        logger.exception("failed_to_save_feedback")
        return {"status": "error", "detail": str(e)}


class PrecomputeRequest(BaseModel):
    partial_content: str

@router.post("/precompute")
async def chat_precompute(
    req: PrecomputeRequest,
    current_user: UUID = None,
):
    # In V2, we might warm up embeddings or connections here
    # For now, it's a silent no-op that just keeps the db pool and connection warm
    return {"status": "ok"}






@router.get(
    "/history/{session_id}",
)
async def history(
    session_id: UUID,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    messages = (
        await session_store.get_messages(
            session_id
        )
    )

    if not messages:
        from backend.db.postgres import get_async_session
        from sqlalchemy import text
        from backend.models.message import Message

        async for db in get_async_session():
            res = await db.execute(
                text("""
                    SELECT id, role, content, created_at, metadata 
                    FROM messages 
                    WHERE session_id = :session_id 
                    ORDER BY created_at ASC
                """),
                {"session_id": session_id}
            )
            rows = res.fetchall()
            messages = []
            for row in rows:
                metadata = row.metadata if row.metadata else {}
                print(f"ROW METADATA TYPE: {type(metadata)} VALUE: {metadata}", flush=True)
                if isinstance(metadata, str):
                    import json
                    try:
                        metadata = json.loads(metadata)
                    except:
                        metadata = {}
                messages.append(
                    Message(
                        id=str(row.id),
                        session_id=session_id,
                        role=row.role,
                        content=row.content,
                        timestamp=row.created_at.strftime("%I:%M %p") if row.created_at else "Past",
                        metadata=metadata
                    )
                )

    return {
        "session_id": (
            str(
                session_id
            )
        ),
        "messages": messages,
        "response_time_ms": 0,
    }


@router.delete(
    "/session/{session_id}",
)
async def end_session(
    session_id: UUID,
    current_user: UUID = Depends(
        get_current_user
    ),
):
    try:
        consolidate_session.delay(
            str(
                session_id
            ),
            str(
                current_user
            ),
        )

        await session_store.clear_session(
            session_id
        )

        return {
            "status": (
                "consolidating"
            ),
            "response_time_ms": 0,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": (
                    str(
                        exc
                    )
                )
            },
        )

@router.get("/wipe")
async def wipe_user_data(
    current_user: UUID = Depends(get_current_user),
):
    from backend.db.postgres import get_async_session
    from sqlalchemy import text
    try:
        async for db in get_async_session():
            await db.execute(text("DELETE FROM memories WHERE user_id = :uid"), {"uid": current_user})
            await db.execute(text("DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE user_id = :uid)"), {"uid": current_user})
            await db.execute(text("DELETE FROM sessions WHERE user_id = :uid"), {"uid": current_user})
            await db.commit()
        return {"status": "success", "message": f"Wiped all sessions, messages, and memories for user {current_user}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
