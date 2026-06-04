"""
backend/api/sessions.py

Sessions management API for Memora.
Lists, creates, and manages conversation sessions.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from backend.dependencies import get_current_user
from backend.db.postgres import get_async_session
from sqlalchemy import text

import json
import asyncio
from backend.core.response_generator.generator import ResponseGenerator

router = APIRouter(
    prefix="/api/sessions",
    tags=["sessions"],
)

logger = logging.getLogger(__name__)

async def _summarize_session(session_id: UUID, user_id: UUID):
    try:
        generator = ResponseGenerator()
        async for db in get_async_session():
            # Get messages
            res = await db.execute(
                text("SELECT role, content FROM messages WHERE session_id = :session_id ORDER BY created_at ASC"),
                {"session_id": session_id}
            )
            messages = res.fetchall()
            if not messages: return

            transcript = "\n".join([f"{m[0]}: {m[1]}" for m in messages])
            summary = await generator.generate_summary(transcript)
            
            # Save to metadata
            await db.execute(
                text("""
                    UPDATE sessions 
                    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('summary', :summary)
                    WHERE id = :session_id AND user_id = :user_id
                """),
                {"summary": summary, "session_id": session_id, "user_id": user_id}
            )
            await db.commit()
    except Exception:
        logger.exception("background_summarize_failed")

async def _summarize_session_if_archived(session_id: UUID, user_id: UUID, body: dict):
    if body.get("is_archived") is True:
        asyncio.create_task(_summarize_session(session_id, user_id))

@router.get("/")
async def list_sessions(
    current_user: UUID = Depends(get_current_user),
):
    """List all sessions for the current user, newest first."""
    try:
        async for db in get_async_session():
            result = await db.execute(
                text("""
                    SELECT id, title, started_at, ended_at,
                           message_count, is_consolidated, metadata,
                           is_starred, is_archived
                    FROM sessions
                    WHERE user_id = :user_id
                    ORDER BY started_at DESC
                    LIMIT 100
                """),
                {"user_id": current_user},
            )
            rows = result.fetchall()

            sessions = []
            for row in rows:
                r = dict(row._mapping)
                sessions.append({
                    "id": str(r["id"]),
                    "title": r.get("title") or "New Conversation",
                    "started_at": r["started_at"].isoformat() if r.get("started_at") else None,
                    "ended_at": r["ended_at"].isoformat() if r.get("ended_at") else None,
                    "message_count": r.get("message_count", 0),
                    "is_consolidated": r.get("is_consolidated", False),
                    "is_starred": r.get("is_starred", False),
                    "is_archived": r.get("is_archived", False),
                })

            return {"sessions": sessions}

    except Exception as exc:
        logger.exception("list_sessions_failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.patch("/{session_id}")
async def update_session(
    session_id: UUID,
    body: dict,
    current_user: UUID = Depends(get_current_user),
):
    """Update session properties like title, is_starred, is_archived."""
    updates = []
    params = {"session_id": session_id, "user_id": current_user}

    if "title" in body:
        title = body["title"].strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title cannot be empty.")
        updates.append("title = :title")
        params["title"] = title

    if "is_starred" in body:
        updates.append("is_starred = :is_starred")
        params["is_starred"] = bool(body["is_starred"])

    if "is_archived" in body:
        updates.append("is_archived = :is_archived")
        params["is_archived"] = bool(body["is_archived"])
        await _summarize_session_if_archived(session_id, current_user, body)

    if not updates:
        return {"status": "ok", "message": "No updates provided"}

    try:
        async for db in get_async_session():
            await db.execute(
                text(f"""
                    UPDATE sessions SET {", ".join(updates)}
                    WHERE id = :session_id AND user_id = :user_id
                """),
                params,
            )
            await db.commit()
        return {"status": "ok"}

    except Exception as exc:
        logger.exception("update_session_failed")
        raise HTTPException(status_code=500, detail=str(exc))

@router.patch("/{session_id}/title")
async def update_session_title(
    session_id: UUID,
    body: dict,
    current_user: UUID = Depends(get_current_user),
):
    """Legacy endpoint. Maps to general update."""
    return await update_session(session_id, body, current_user)


@router.delete("/{session_id}")
async def delete_session(
    session_id: UUID,
    current_user: UUID = Depends(get_current_user),
):
    """Delete a session record."""
    try:
        async for db in get_async_session():
            await db.execute(
                text("""
                    DELETE FROM sessions
                    WHERE id = :session_id AND user_id = :user_id
                """),
                {"session_id": session_id, "user_id": current_user},
            )
            await db.commit()
        return {"status": "deleted"}

    except Exception as exc:
        logger.exception("delete_session_failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{session_id}/export")
async def export_session(
    session_id: UUID,
    current_user: UUID = Depends(get_current_user),
):
    """Export a single session and its messages."""
    try:
        async for db in get_async_session():
            # Get session
            res = await db.execute(
                text("SELECT * FROM sessions WHERE id = :session_id AND user_id = :user_id"),
                {"session_id": session_id, "user_id": current_user}
            )
            session = res.first()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Get messages
            m_res = await db.execute(
                text("SELECT role, content, created_at FROM messages WHERE session_id = :session_id ORDER BY created_at ASC"),
                {"session_id": session_id}
            )
            messages = [dict(m._mapping) for m in m_res.fetchall()]

            # Format as JSON
            s_dict = dict(session._mapping)
            s_dict["id"] = str(s_dict["id"])
            s_dict["user_id"] = str(s_dict["user_id"])
            s_dict["started_at"] = s_dict["started_at"].isoformat() if s_dict["started_at"] else None
            s_dict["ended_at"] = s_dict["ended_at"].isoformat() if s_dict["ended_at"] else None
            
            for m in messages:
                m["created_at"] = m["created_at"].isoformat() if m["created_at"] else None

            export_data = {
                "session": s_dict,
                "messages": messages
            }

            from fastapi.responses import JSONResponse
            return JSONResponse(
                content=export_data, 
                headers={"Content-Disposition": f'attachment; filename="session_{session_id}.json"'}
            )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("export_session_failed")
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/export/all")
async def export_all_sessions(
    current_user: UUID = Depends(get_current_user),
):
    """Export all sessions and messages for the user."""
    try:
        async for db in get_async_session():
            res = await db.execute(
                text("SELECT * FROM sessions WHERE user_id = :user_id ORDER BY started_at DESC"),
                {"user_id": current_user}
            )
            sessions = [dict(r._mapping) for r in res.fetchall()]
            
            # We will just fetch all messages for the user
            m_res = await db.execute(
                text("""
                    SELECT m.session_id, m.role, m.content, m.created_at 
                    FROM messages m
                    JOIN sessions s ON m.session_id = s.id
                    WHERE s.user_id = :user_id 
                    ORDER BY m.created_at ASC
                """),
                {"user_id": current_user}
            )
            messages = [dict(m._mapping) for m in m_res.fetchall()]

            # Fetch all memories
            mem_res = await db.execute(
                text("""
                    SELECT id, content, memory_type, created_at, source_session_id
                    FROM memories
                    WHERE user_id = :user_id
                """),
                {"user_id": current_user}
            )
            memories = []
            for m in mem_res.fetchall():
                m_dict = dict(m._mapping)
                m_dict["id"] = str(m_dict["id"])
                m_dict["created_at"] = m_dict["created_at"].isoformat() if m_dict["created_at"] else None
                if m_dict.get("source_session_id"):
                    m_dict["source_session_id"] = str(m_dict["source_session_id"])
                memories.append(m_dict)

            # Group messages by session_id
            from collections import defaultdict
            msgs_by_session = defaultdict(list)
            for m in messages:
                m_copy = dict(m)
                m_copy["session_id"] = str(m_copy["session_id"])
                m_copy["created_at"] = m_copy["created_at"].isoformat() if m_copy["created_at"] else None
                msgs_by_session[m_copy["session_id"]].append(m_copy)

            export_data = []
            for s in sessions:
                s_copy = dict(s)
                s_copy["id"] = str(s_copy["id"])
                s_copy["user_id"] = str(s_copy["user_id"])
                s_copy["started_at"] = s_copy["started_at"].isoformat() if s_copy["started_at"] else None
                s_copy["ended_at"] = s_copy["ended_at"].isoformat() if s_copy["ended_at"] else None
                
                export_data.append({
                    "session": s_copy,
                    "messages": msgs_by_session.get(s_copy["id"], [])
                })

            from fastapi.responses import JSONResponse
            return JSONResponse(
                content={"sessions": export_data, "memories": memories}, 
                headers={"Content-Disposition": 'attachment; filename="memora_full_export.json"'}
            )

    except Exception as exc:
        logger.exception("export_all_sessions_failed")
        raise HTTPException(status_code=500, detail=str(exc))
