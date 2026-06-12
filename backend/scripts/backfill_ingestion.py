import asyncio
import logging
from uuid import UUID

from backend.db.postgres import AsyncSessionLocal
from sqlalchemy import text
from backend.models.memory import MemoryCreate, MemoryType
from backend.core.long_term_memory.ingestion.gateway import MemoryIngestionGateway

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_backfill():
    logger.info("Starting historical ingestion backfill...")
    gateway = MemoryIngestionGateway()

    from backend.core.events.event_router import start_event_router
    router_task = asyncio.create_task(start_event_router())
    
    async with AsyncSessionLocal() as session:
        # Fetch all user messages
        result = await session.execute(
            text("SELECT id, session_id, role, content FROM messages WHERE role = 'user' ORDER BY created_at ASC")
        )
        messages = result.mappings().all()

        logger.info(f"Found {len(messages)} historical user messages.")

        from backend.core.perception.parser import parse
        
        for msg in messages:
            try:
                sess_res = await session.execute(
                    text("SELECT user_id FROM sessions WHERE id = :id"),
                    {"id": msg["session_id"]}
                )
                sess_row = sess_res.mappings().first()
                if not sess_row:
                    continue
                    
                user_id = sess_row["user_id"]
                content = msg["content"]
                
                logger.info(f"Processing message {msg['id']} for user {user_id}")
                
                perception = await parse(content, session_id=msg["session_id"], user_id=user_id)
                
                if not perception:
                    logger.warning(f"No perception result for message {msg['id']}")
                    continue
                    
                mem_type = perception.memory_type if perception.memory_type else MemoryType.EPISODIC
                
                mem_create = MemoryCreate(
                    user_id=user_id,
                    content=content,
                    memory_type=mem_type,
                    importance_score=0.7, # Boost slightly for backfill
                    emotional_weight=0.0,
                    embedding=perception.embedding,
                    entities=[e.get("text", "") for e in (perception.entities or [])],
                    source_session_id=msg["session_id"],
                    metadata={"backfilled": True}
                )
                
                # Ingest will naturally publish MemoryCreated, which triggers Graph and Qdrant syncs.
                memory = await gateway.ingest(mem_create)
                if memory:
                    logger.info(f"Successfully backfilled message {msg['id']} into memory {memory.id}")
                else:
                    logger.info(f"Message {msg['id']} discarded (likely duplicate or low importance).")
            except Exception as e:
                logger.error(f"Failed to backfill message {msg['id']}: {e}")
                
                
    logger.info("Waiting for event pipeline to process background tasks...")
    await asyncio.sleep(2)
    router_task.cancel()
    logger.info("Backfill completed.")

if __name__ == "__main__":
    asyncio.run(run_backfill())
