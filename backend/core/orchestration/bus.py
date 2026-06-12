"""
backend/core/orchestration/bus.py

Central orchestration pipeline for Memora.
"""

from __future__ import annotations

import asyncio
import functools
import logging
import time
import traceback
from collections.abc import AsyncGenerator
from uuid import uuid4, UUID

from backend.models.message import (
    ChatRequest,
    ChatResponse,
    Message,
    MessageRole,
)
from backend.core.perception.parser import parse
from backend.core.working_memory.session_store import (
    session_store,
)
from backend.core.retrieval_engine.query_analyzer import (
    QueryAnalyzer,
)
from backend.core.retrieval_engine.multi_hop_retriever import (
    MultiHopRetriever,
)
from backend.core.retrieval_engine.reranker import (
    rerank,
)
from backend.core.retrieval_engine.context_assembler import (
    ContextAssembler,
)
from backend.core.working_memory.attention_window import (
    AttentionWindow,
    AttentionWindowManager,
)
from backend.core.reasoning_engine.chain_of_thought import (
    ChainOfThought,
)
from backend.core.reasoning_engine.planner import (
    Planner,
)
from backend.core.reasoning_engine.reflection import (
    Reflection,
)
from backend.core.response_generator.tone_adapter import (
    build_system_prompt,
)
from backend.core.response_generator.generator import (
    ResponseGenerator,
)
from backend.core.orchestration.state_machine import (
    StateMachine,
    TurnContext,
    ConversationState,
)
from backend.core.orchestration.priority_scheduler import (
    PriorityScheduler,
)
from backend.workers.indexing_worker import (
    index_memory,
)
from backend.core.events.event_publisher import publish_event
from backend.core.events.event_types import DomainEvent, EventType
from backend.models.memory import Memory


logger = logging.getLogger(__name__)


def safe_create_task(coro, name: str = "unnamed") -> asyncio.Task:
    """
    Create an asyncio task with built-in error handling.

    Features:
    - Logs exceptions with full traceback
    - Records task name for debugging
    - Prevents "Task exception was never retrieved" warnings
    - Handles cancellation gracefully

    Use this instead of raw asyncio.create_task() to ensure background
    task failures are never silently swallowed.

    Usage:
        safe_create_task(_increment_session_message_count(sid), "increment_count")
    """
    task = asyncio.create_task(coro, name=name)

    def _log_error(t: asyncio.Task) -> None:
        try:
            exc = t.exception()
            if exc is not None:
                logger.error(
                    "Background task '%s' failed: %s\n%s",
                    t.get_name(), exc, traceback.format_exc(),
                )
        except asyncio.CancelledError:
            logger.debug("Background task '%s' was cancelled.", t.get_name())
        except Exception as log_err:
            logger.error(
                "Error handler for task '%s' failed: %s",
                t.get_name(), log_err,
            )

    task.add_done_callback(_log_error)
    return task


async def _ensure_session_in_db(
    session_id: UUID,
    user_id: UUID,
) -> bool:
    """
    Insert a session row if it doesn't already exist.
    Returns True if this is a brand-new session (first message).
    """
    try:
        from backend.db.postgres import get_async_session
        from sqlalchemy import text
        from datetime import datetime, timezone

        from backend.db.postgres import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                text("SELECT id FROM sessions WHERE id = :id"),
                {"id": session_id},
            )
            existing = res.first()
            if not existing:
                now = datetime.now(timezone.utc)
                await db.execute(
                    text("""
                        INSERT INTO sessions (id, user_id, started_at, message_count, is_consolidated, metadata)
                        VALUES (:id, :user_id, :now, 0, false, '{}'::jsonb)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {"id": session_id, "user_id": user_id, "now": now},
                )
                await db.commit()
                return True  # new session
            return False  # existing session
    except Exception:
        logger.exception("ensure_session_in_db_failed")
        return False


async def _update_session_title(
    session_id: UUID,
    generator: ResponseGenerator,
    first_message: str,
) -> None:
    """Generate a title for the session and persist it."""
    try:
        title = await generator.generate_title(first_message)
        from backend.db.postgres import get_async_session
        from sqlalchemy import text

        from backend.db.postgres import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("UPDATE sessions SET title = :title WHERE id = :id"),
                {"title": title, "id": session_id},
            )
            await db.commit()
        logger.info("Session title set: session=%s title=%s", session_id, title)
    except Exception:
        logger.exception("update_session_title_failed")


async def _increment_session_message_count(session_id: UUID) -> None:
    """Increment the message_count for a session."""
    try:
        from backend.db.postgres import get_async_session
        from sqlalchemy import text

        from backend.db.postgres import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("UPDATE sessions SET message_count = message_count + 1 WHERE id = :id"),
                {"id": session_id},
            )
            await db.commit()
    except Exception:
        logger.exception("increment_session_message_count_failed")


from backend.models.user import UserContext, User, UserPreferences
from datetime import datetime, timezone
import re


async def _extract_and_save_user_info(user_id: UUID, text: str) -> None:
    """
    Extract self-identifying information from the user's message
    (like their name) and persist it to the users table.
    """
    try:
        name = None

        # Patterns: "my name is X", "I am X", "I'm X", "call me X"
        patterns = [
            r"(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
            r"(?:my name's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                break

        if not name:
            return

        from backend.db.postgres import get_async_session
        from sqlalchemy import text as sqla_text

        from backend.db.postgres import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            await db.execute(
                sqla_text("""
                    UPDATE users
                    SET display_name = :name, updated_at = :now
                    WHERE id = :user_id AND (display_name IS NULL OR display_name = 'User')
                """),
                {"name": name, "user_id": user_id, "now": now},
            )
            await db.commit()
            logger.info("User display_name updated: user=%s name=%s", user_id, name)

    except Exception:
        logger.exception("extract_and_save_user_info_failed")

async def get_or_create_user_context(user_id: UUID) -> UserContext:
    from backend.db.postgres import AsyncSessionLocal
    from sqlalchemy import text
    
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            text("SELECT * FROM users WHERE id = :id"),
            {"id": user_id}
        )
        row = res.first()
        
        if not row:
            now = datetime.now(timezone.utc)
            await session.execute(
                text("""
                    INSERT INTO users (id, external_id, display_name, preferences, emotional_baseline, created_at, updated_at)
                    VALUES (:id, :external_id, 'User', '{}'::jsonb, 0.0, :now, :now)
                """),
                {
                    "id": user_id,
                    "external_id": str(user_id),
                    "now": now
                }
            )
            await session.commit()
            
            res = await session.execute(
                text("SELECT * FROM users WHERE id = :id"),
                {"id": user_id}
            )
            row = res.first()
            
        user_data = dict(row._mapping)
        prefs = user_data.get("preferences") or {}
        if isinstance(prefs, str):
            import json
            prefs = json.loads(prefs)
            
        user_preferences = UserPreferences(
            response_tone=prefs.get("response_tone", "balanced"),
            verbosity=prefs.get("verbosity", "medium"),
            memory_enabled=prefs.get("memory_enabled", True),
            emotional_tracking=prefs.get("emotional_tracking", True),
            topics_of_interest=prefs.get("topics_of_interest", []),
            timezone=prefs.get("timezone", "UTC")
        )
        
        user_model = User(
            id=user_id,
            external_id=user_data.get("external_id"),
            display_name=user_data.get("display_name"),
            persona_summary=user_data.get("persona_summary"),
            preferences=user_preferences,
            emotional_baseline=user_data.get("emotional_baseline") or 0.0,
            created_at=user_data.get("created_at"),
            updated_at=user_data.get("updated_at")
        )
        
        return UserContext(
            user=user_model,
            recent_emotional_state=0.0,
            total_memories_count=0,
            persona_keywords=[]
        )


class BusError(Exception):
    pass


class CognitiveOrchestrationBus:
    def __init__(self) -> None:
        self.scheduler = (
            PriorityScheduler()
        )

        self.query_analyzer = (
            QueryAnalyzer()
        )

        self.retriever = (
            MultiHopRetriever()
        )

        self.context_assembler = (
            ContextAssembler()
        )

        self.reasoner = (
            ChainOfThought()
        )

        self.planner = (
            Planner()
        )

        self.generator = (
            ResponseGenerator()
        )

        self.reflection = (
            Reflection()
        )

        self.state_machine = (
            StateMachine()
        )

        self.attention_manager = (
            AttentionWindowManager()
        )

    async def process(
        self,
        chat_request: ChatRequest,
    ):
        if not chat_request.stream:
            raise ValueError("V2 architecture only supports streaming")

        # 1. Fast Path Stream
        async def fast_stream():
            try:
                started = time.perf_counter()
                session_id = chat_request.session_id or uuid4()
                turn = TurnContext(
                    session_id=session_id,
                    user_id=chat_request.user_id,
                    query=chat_request.content,
                )
                pipeline_events = []

                yield {"event": "status", "data": {"state": "memory_started"}}

                from backend.db.postgres import get_async_session
                from sqlalchemy import text

                # ── Step 1: Guarantee the user row exists BEFORE the session ──
                # Sessions FK references users(id), messages FK references sessions(id).
                # Creating them out-of-order causes silent failures + FK violations.
                try:
                    user_ctx = await get_or_create_user_context(turn.user_id)
                except Exception:
                    logger.exception("user_create_failed")
                    yield {"event": "error", "data": {"message": "Failed to load user profile."}}
                    return

                # ── Step 2: Guarantee the session row exists ──
                is_new_session = await _ensure_session_in_db(
                    session_id=session_id,
                    user_id=turn.user_id,
                )

                # Verify session actually exists before attempting message insert
                from backend.db.postgres import AsyncSessionLocal
                async with AsyncSessionLocal() as db:
                    res = await db.execute(
                        text("SELECT id FROM sessions WHERE id = :id"),
                        {"id": session_id},
                    )
                    if not res.first():
                        logger.error("session_missing_after_ensure: session=%s", session_id)
                        yield {"event": "error", "data": {"message": "Session could not be created. Please try again."}}
                        return

                # ── Step 3: Persist user message ──
                user_msg = Message(
                    session_id=session_id,
                    role=MessageRole.USER,
                    content=turn.query,
                )
                await session_store.add_message(session_id=session_id, message=user_msg)

                try:
                    from backend.db.postgres import AsyncSessionLocal
                    async with AsyncSessionLocal() as db:
                        await db.execute(text(
                            "INSERT INTO messages (id, session_id, role, content) VALUES (:id, :session_id, :role, :content)"
                        ), {"id": user_msg.id, "session_id": session_id, "role": user_msg.role.value, "content": user_msg.content})
                        await db.commit()
                except Exception:
                    logger.exception("user_message_insert_failed")
                    # Non-fatal — message is in session_store, continue with response

                # Real-Time Perception & Retrieval
                try:
                    self.state_machine.transition(turn, ConversationState.RECEIVED)
                    perception = await parse(turn.query, session_id=session_id, user_id=turn.user_id)
                    turn.perception_result = perception
                    self.state_machine.transition(turn, ConversationState.PERCEIVED)
                    if perception and perception.entities:
                        evt_entity = {"event": "entity_extracted", "data": {"entities": [e.get("text", "") for e in perception.entities]}, "timestamp": datetime.now(timezone.utc).isoformat()}
                        pipeline_events.append(evt_entity)
                        yield evt_entity
                        
                        evt_graph = {"event": "graph_update", "data": {"nodes_created": len(perception.entities), "relationships_created": max(0, len(perception.entities) - 1)}, "timestamp": datetime.now(timezone.utc).isoformat()}
                        pipeline_events.append(evt_graph)
                        yield evt_graph
                except Exception as exc:
                    logger.exception("Perception stage failed in stream", exc_info=exc)
                    perception = None

                retrieved_memories = []
                if perception:
                    try:
                        analysis = await self.query_analyzer.analyze(turn.query, turn.perception_result)
                        from backend.models.memory import MemorySearchQuery
                        search_query = MemorySearchQuery(
                            user_id=turn.user_id,
                            query_text=turn.query,
                            query_embedding=turn.perception_result.embedding,
                            memory_types=analysis.search_memory_types,
                        )
                        candidates = await self.retriever.retrieve(search_query, analysis)
                        reranked = await rerank(turn.query, candidates)
                        assembled = await self.context_assembler.assemble(turn.query, reranked)
                        turn.retrieved_memories = assembled
                        self.state_machine.transition(turn, ConversationState.RETRIEVED)
                        retrieved_memories = assembled or []
                        retrieval_payload = []
                        for result in retrieved_memories:
                            score = result.rerank_score if result.rerank_score is not None else result.similarity_score
                            retrieval_payload.append({"id": str(result.memory.id), "content": result.memory.content, "similarity": score})
                        
                        evt_retrieval = {"event": "retrieval_complete", "data": {"retrieved_memories": retrieval_payload}, "timestamp": datetime.now(timezone.utc).isoformat()}
                        pipeline_events.append(evt_retrieval)
                        yield evt_retrieval
                    except Exception as exc:
                        logger.exception("Retrieval stage failed in stream", exc_info=exc)
                        turn.retrieved_memories = []

                # Yield memory complete state to UI
                yield {
                    "event": "status",
                    "data": {
                        "state": "memory_complete",
                        "details": {"retrieved": len(retrieved_memories)},
                    },
                }

                # Yield context memories to update frontend UI instantly!
                if retrieved_memories:
                    metadata_memories = []
                    for result in retrieved_memories:
                        memory = result.memory
                        score = result.rerank_score if result.rerank_score is not None else result.similarity_score
                        metadata_memories.append({
                            "id": str(memory.id),
                            "content": memory.content,
                            "relevance": score,
                            "type": memory.memory_type.value,
                            "source": getattr(memory, "source", "memora") or "memora",
                            "created_at": memory.created_at.isoformat() if memory.created_at else None,
                            "times_used": memory.access_count,
                            "entities": getattr(memory, "entities", []) or [],
                            "emotional_weight": getattr(memory, "emotional_weight", 0.0),
                            "importance_score": getattr(memory, "importance_score", 0.5),
                            "metadata": getattr(memory, "metadata", {}) or {}
                        })
                    yield {"event": "metadata", "data": {"memories": metadata_memories}}

                # Fast Path Attention Window (Now WITH actual retrieved memories!)
                attention_window = await self.attention_manager.build(
                    session_id=session_id,
                    user_id=turn.user_id,
                    retrieved_memories=retrieved_memories,
                    session_store=session_store,
                )
                
                # user_ctx already fetched at the top of fast_stream (Step 1)
                from backend.core.reasoning_engine.planner import ResponsePlan
                system_prompt = await build_system_prompt(user_ctx, ResponsePlan(strategy="answer", tone_override=None, should_ask_followup=False))
                
                generated = await self.generator.generate(
                    query=turn.query,
                    attention_window=attention_window,
                    system_prompt=system_prompt,
                    reasoning_trace="",
                    stream=True,
                )
                
                yield {"event": "thinking", "data": {"phase": "constructing_response"}}
                
                collected = []
                try:
                    async for chunk in generated:
                        collected.append(chunk)
                        yield {"event": "token", "data": {"text": chunk}}
                except Exception as e:
                    yield {"event": "error", "data": {"message": str(e)}}
                    
                response_text = "".join(collected)
                
                yield {"event": "status", "data": {"state": "reflection_started"}}
                
                # Save Fast Path assistant msg
                assistant_msg = None
                try:
                    assistant_msg = Message(
                        session_id=session_id,
                        role=MessageRole.ASSISTANT,
                        content=response_text,
                    )
                    await session_store.add_message(session_id=session_id, message=assistant_msg)
                    from backend.db.postgres import AsyncSessionLocal
                    async with AsyncSessionLocal() as db:
                        await db.execute(text(
                            "INSERT INTO messages (id, session_id, role, content) VALUES (:id, :session_id, :role, :content)"
                        ), {"id": assistant_msg.id, "session_id": session_id, "role": assistant_msg.role.value, "content": assistant_msg.content})
                        await db.commit()
                except Exception:
                    logger.exception("assistant store failed")
                    
                safe_create_task(
                    _increment_session_message_count(session_id),
                    name=f"increment_count_{session_id}",
                )
                if is_new_session:
                    safe_create_task(
                        _update_session_title(session_id, self.generator, turn.query),
                        name=f"update_title_{session_id}",
                    )
                
                # Yield live cognitive events instead of running in background
                async for event in self.process_cognitive(turn, response_text):
                    pipeline_events.append(event)
                    yield event
                
                try:
                    import json
                    if assistant_msg is not None:
                        # Update the in-memory message object so session_store cache is not stale
                        if not assistant_msg.metadata:
                            assistant_msg.metadata = {}
                        assistant_msg.metadata["pipeline_flow"] = pipeline_events
                        await session_store.update_last_message(turn.session_id, assistant_msg)

                        from backend.db.postgres import AsyncSessionLocal
                        async with AsyncSessionLocal() as db:
                            await db.execute(
                                text("UPDATE messages SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{pipeline_flow}', CAST(:flow AS jsonb)) WHERE id = :id"),
                                {"flow": json.dumps(pipeline_events), "id": assistant_msg.id}
                            )
                            await db.commit()
                except Exception as e:
                    logger.exception("Failed to update pipeline flow metadata")
                
                latency = int((time.perf_counter() - started) * 1000)
                yield {"event": "complete", "data": {"duration_ms": latency, "tokens": len(collected)}}
                
            except Exception as e:
                logger.exception("fast stream failed")
                yield {"event": "error", "data": {"message": str(e)}}

        return fast_stream()

    async def process_cognitive(self, turn: TurnContext, fast_response: str):
        """Runs the cognitive pipeline (Retrieval + Reflection) in the background"""
        try:
            logger.info("Starting background cognitive pipeline")
            # 1. Perception
            try:
                if not turn.perception_result:
                    perception = await parse(turn.query, session_id=turn.session_id, user_id=turn.user_id)
                    turn.perception_result = perception
                try:
                    self.state_machine.transition(turn, ConversationState.PERCEIVED)
                except Exception:
                    pass
            except Exception as exc:
                logger.exception("Background perception failed", exc_info=exc)
            # 2. Retrieval
            try:
                if not turn.retrieved_memories:
                    analysis = await self.query_analyzer.analyze(turn.query, turn.perception_result)
                    from backend.models.memory import MemorySearchQuery
                    search_query = MemorySearchQuery(
                        user_id=turn.user_id,
                        query_text=turn.query,
                        query_embedding=turn.perception_result.embedding,
                        memory_types=analysis.search_memory_types,
                    )
                    candidates = await self.retriever.retrieve(search_query, analysis)
                    reranked = await rerank(turn.query, candidates)
                    assembled = await self.context_assembler.assemble(turn.query, reranked)
                    turn.retrieved_memories = assembled
                try:
                    self.state_machine.transition(turn, ConversationState.RETRIEVED)
                except Exception:
                    pass
            except Exception as exc:
                logger.exception("Background retrieval failed", exc_info=exc)
                turn.retrieved_memories = []

            # 3. Reflection
            try:
                await self.reflection.reflect(
                    response_text=fast_response,
                    query=turn.query,
                    context_memories=[r.memory for r in (turn.retrieved_memories or [])],
                )
                from backend.workers.indexing_worker import index_memory
                index_memory.delay({
                    "user_id": str(turn.user_id),
                    "content": fast_response,
                    "source_session_id": str(turn.session_id),
                })
                
                # Live memory extraction via LLM
                import asyncio
                from datetime import datetime, timezone
                from uuid import uuid4
                from backend.models.memory import MemoryCreate, MemoryType
                from backend.core.perception.embedder import embed_text
                from backend.core.long_term_memory.stores.semantic_store import SemanticStore
                from backend.core.long_term_memory.stores.emotional_store import EmotionalStore
                from backend.db.postgres import AsyncSessionLocal
                from backend.config import settings

                prompt = (
                    "Extract any explicit facts, preferences, personal facts, family details, emotional states, or projects stated by the user in this message.\n"
                    "Summarize them intelligently into concise statements (e.g., 'User's name is Parul', 'User is building Memora using FastAPI').\n"
                    "For each extracted statement, categorize it into exactly one of these types: SEMANTIC, EPISODIC, PROCEDURAL, or EMOTIONAL.\n"
                    "Format each line EXACTLY as: Statement | TYPE\n"
                    "Examples:\n"
                    "User is building Memora using FastAPI. | SEMANTIC\n"
                    "User visited Japan in 2024. | EPISODIC\n"
                    "User knows how to bake bread. | PROCEDURAL\n"
                    "User is feeling sad today. | EMOTIONAL\n"
                    "Do not use bullet points or numbers. If there are no facts to extract, reply with exactly the word NONE.\n"
                    "Respond with ONLY the extracted statements or NONE."
                )
                logger.info(f"Sending extraction prompt to LLM...")

                try:
                    res = await self.generator.client.chat_completion(
                        model=settings.llm_model_name,
                        messages=[
                            {"role": "system", "content": prompt},
                            {"role": "user", "content": turn.query}
                        ],
                        max_tokens=150,
                        temperature=0.2,
                    )
                    
                    if res and res.choices and len(res.choices) > 0:
                        extracted_text = res.choices[0].message.content.strip()
                        logger.info(f"LLM Extraction Response: {extracted_text}")
                        if extracted_text and extracted_text.upper() != "NONE":
                            lines = [f.strip() for f in extracted_text.splitlines() if f.strip() and not f.strip().startswith(('•', '-', '*'))]
                            
                            sem_store = SemanticStore(session_factory=AsyncSessionLocal)
                            emo_store = EmotionalStore(session_factory=AsyncSessionLocal)
                            
                            for line in lines:
                                import re
                                line = re.sub(r'^\d+[\.\)]\s*', '', line)
                                parts = line.split('|')
                                fact = parts[0].strip()
                                type_str = parts[1].strip().upper() if len(parts) > 1 else "SEMANTIC"
                                
                                mem_type = MemoryType.SEMANTIC
                                
                                if type_str == "EMOTIONAL":
                                    mem_type = MemoryType.EMOTIONAL
                                elif type_str == "EPISODIC":
                                    mem_type = MemoryType.EPISODIC
                                elif type_str == "PROCEDURAL":
                                    mem_type = MemoryType.PROCEDURAL
                                
                                embedding = await embed_text(fact)
                                
                                # Deduplication check
                                is_duplicate = False
                                try:
                                    if mem_type == MemoryType.EMOTIONAL:
                                        similar = await emo_store.search_by_vector(embedding, turn.user_id, top_k=1)
                                    else:
                                        similar = await sem_store.search_by_vector(embedding, turn.user_id, top_k=1)
                                        
                                    if similar:
                                        sim_mem = similar[0]
                                        import math
                                        dot = sum(a*b for a,b in zip(embedding, sim_mem.embedding))
                                        norm_a = math.sqrt(sum(a*a for a in embedding))
                                        norm_b = math.sqrt(sum(b*b for b in sim_mem.embedding))
                                        sim_score = dot / (norm_a * norm_b) if norm_a and norm_b else 0
                                        if sim_score > 0.90:
                                            logger.info(f"Skipping duplicate memory (sim={sim_score:.2f}): {fact}")
                                            is_duplicate = True
                                except Exception as e:
                                    logger.warning(f"Deduplication check failed: {e}")
                                    
                                if is_duplicate:
                                    continue
                                
                                # Improved Keyword Importance Scoring
                                boost_words = ['name', 'family', 'location', 'career', 'goal', 'preference', 'project', 'relationship', 'love', 'hate', 'always', 'never']
                                reduce_words = ['today', 'recently', 'yesterday', 'tomorrow', 'feeling', 'bit', 'slightly']
                                
                                lower_fact = fact.lower()
                                importance = 0.65
                                for w in boost_words:
                                    if w in lower_fact:
                                        importance += 0.1
                                for w in reduce_words:
                                    if w in lower_fact:
                                        importance -= 0.1
                                        
                                importance += len(fact.split()) * 0.01
                                importance = min(0.95, max(0.1, importance))
                                yield {"event": "memory_candidate", "data": {"content": fact, "memory_type": mem_type.value, "importance_score": importance}, "timestamp": datetime.now(timezone.utc).isoformat()}
                                
                                new_memory = MemoryCreate(
                                    user_id=turn.user_id,
                                    content=fact,
                                    memory_type=mem_type,
                                    importance_score=importance,
                                    emotional_weight=0.0 if mem_type != MemoryType.EMOTIONAL else 0.8,
                                    embedding=embedding,
                                    source_session_id=turn.session_id,
                                    entities=[e.get("text", "") for e in turn.perception_result.entities] if turn.perception_result and turn.perception_result.entities else [],
                                    metadata={
                                        "extracted_live": True,
                                        "session_id": str(turn.session_id),
                                        "importance_score": importance
                                    }
                                )
                                
                                from backend.core.long_term_memory.ingestion.gateway import MemoryIngestionGateway
                                gateway = MemoryIngestionGateway()
                                persisted_memory = await gateway.ingest(new_memory)

                                if persisted_memory is None:
                                    continue

                                yield {"event": "memory_created", "data": {"memory_id": str(persisted_memory.id), "content": persisted_memory.content, "memory_type": persisted_memory.memory_type.value, "importance_score": persisted_memory.importance_score}, "timestamp": datetime.now(timezone.utc).isoformat()}
                                logger.info(f"Memory saved successfully: {persisted_memory.id}")
                                logger.info(f"Successfully extracted and saved live memory for session {turn.session_id}")
                except Exception as e:
                    status = getattr(e, "status", None)
                    is_auth_error = status in (401, 403) or any(err in str(e) for err in ("401", "403", "Unauthorized", "Forbidden", "gated"))
                    if is_auth_error:
                        logger.error(
                            "Hugging Face API returned 401/403 (Unauthorized/Forbidden) during live memory extraction. "
                            "This usually means the configured model requires gated access, or the HF_API_TOKEN is invalid/lacks permissions.\n"
                            "Model: %s\n"
                            "To resolve this, please either:\n"
                            "1. Request and accept model license terms at: https://huggingface.co/%s\n"
                            "   And ensure your HF_API_TOKEN has 'Read' permission.\n"
                            "2. Switch to an open-access equivalent model (e.g. Qwen/Qwen2.5-72B-Instruct) in your .env.",
                            settings.llm_model_name,
                            settings.llm_model_name
                        )
                    logger.exception(f"Live memory extraction failed: {str(e)} session_id={turn.session_id} user_id={turn.user_id}")

            except Exception as exc:
                logger.exception("Background reflection/ingestion failed", exc_info=exc)
                
            try:
                self.state_machine.transition(turn, ConversationState.GENERATED)
            except Exception:
                pass
            try:
                self.state_machine.transition(turn, ConversationState.STORING)
            except Exception:
                pass
            self.state_machine.transition(turn, ConversationState.COMPLETE)
            logger.info("Completed background cognitive pipeline")
        except Exception as exc:
            logger.exception("Background pipeline failed", exc_info=exc)
