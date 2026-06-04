"""
backend/chrome_extension/router.py

API endpoints for Chrome extension integration.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
import logging

from backend.dependencies import get_current_user
from backend.models.user import User
from backend.chrome_extension.models import ExtensionIngestRequest, ExtensionIngestResponse
from backend.chrome_extension.ingestor import process_extension_ingest
from backend.db.postgres import AsyncSessionLocal
from backend.db.redis_client import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["extension"],
)


class PlatformStats(BaseModel):
    count: int
    share: float
    active: bool
    last_active: Optional[str] = None
    this_week: int = 0


class ExtensionStatus(BaseModel):
    installed: bool
    version: str
    last_sync: Optional[str]
    global_pause: bool
    total_ingested: int
    conversations_processed: int
    duplicates_skipped: int
    platforms: dict[str, dict]


@router.get("/status", response_model=ExtensionStatus)
async def get_extension_status(
    current_user: User = Depends(get_current_user),
):
    """
    Return real extension statistics for the current user.
    Queries Postgres for per-platform memory counts and
    Redis for last sync timestamp.
    """
    uid = str(current_user)

    # Per-platform memory counts from Postgres
    platform_counts: dict[str, int] = {}
    total = 0
    try:
        async with AsyncSessionLocal() as session:
            rows = await session.execute(
                text("""
                    SELECT
                        metadata->>'platform' AS platform,
                        COUNT(*) AS cnt
                    FROM memories
                    WHERE user_id = :uid
                      AND metadata->>'platform' IS NOT NULL
                    GROUP BY metadata->>'platform'
                """),
                {"uid": uid},
            )
            for row in rows.fetchall():
                platform_counts[row[0]] = int(row[1])
                total += int(row[1])
    except Exception:
        logger.exception("extension_status_db_error")

    # Last sync time and pause status from Redis
    last_sync: Optional[str] = None
    global_pause = False
    try:
        redis = await get_redis_client()
        last_sync = await redis.get(f"extension:last_sync:{uid}")
        
        pause_val = await redis.get(f"extension:pause:{uid}")
        if pause_val and pause_val.decode('utf-8') == "true":
            global_pause = True
    except Exception:
        pass

    def _platform(name: str) -> dict:
        count = platform_counts.get(name, 0)
        return {
            "count": count,
            "share": round(count / total, 2) if total > 0 else 0.0,
            "active": count > 0,
            "last_active": None,
            "this_week": 0,
        }

    return ExtensionStatus(
        installed=True,
        version="v1.0.2",
        last_sync=last_sync or "Never",
        global_pause=global_pause,
        total_ingested=total,
        conversations_processed=total,
        duplicates_skipped=0,
        platforms={
            "chatgpt": _platform("chatgpt"),
            "claude": _platform("claude"),
            "gemini": _platform("gemini"),
        },
    )


class PauseRequest(BaseModel):
    pause: bool

@router.post("/status/pause")
async def toggle_extension_pause(
    request: PauseRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        redis = await get_redis_client()
        await redis.set(
            f"extension:pause:{current_user}",
            "true" if request.pause else "false"
        )
        return {"status": "success", "global_pause": request.pause}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to toggle pause")


@router.post("/ingest", response_model=ExtensionIngestResponse)
async def ingest_conversation(
    request: ExtensionIngestRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        memory_id, discarded = await process_extension_ingest(request, current_user)

        # Update last sync timestamp in Redis
        try:
            redis = await get_redis_client()
            await redis.set(
                f"extension:last_sync:{current_user}",
                datetime.now(timezone.utc).strftime("%b %d, %Y %I:%M %p"),
                ex=86400,
            )
        except Exception:
            pass

        if discarded:
            return ExtensionIngestResponse(
                status="discarded",
                message="Conversation processed but discarded (e.g. duplicate or low importance).",
                discarded=True
            )

        return ExtensionIngestResponse(
            status="success",
            message="Conversation successfully ingested into memory.",
            memory_id=memory_id,
            discarded=False
        )

    except Exception as exc:
        logger.error(f"Error in /ingest endpoint: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process passive ingestion."
        )
