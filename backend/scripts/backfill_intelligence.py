import asyncio
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.db.postgres import get_async_session
from backend.db.neo4j_client import get_neo4j_driver, init_neo4j, close_neo4j
from backend.db.qdrant_client import get_qdrant_client, init_qdrant, close_qdrant
from backend.db.redis_client import get_redis_client
from backend.core.long_term_memory.stores.semantic_store import semantic_store
from backend.core.long_term_memory.stores.episodic_store import episodic_store
from backend.core.events.event_types import DomainEvent, EventType
from backend.core.events.event_publisher import publish_event
from backend.core.events.event_types import DomainEvent, EventType
from backend.core.events.event_publisher import publish_event

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

async def backfill():
    logger.info("Starting Idempotent Intelligence Backfill...")
    
    # 1. Initialize Clients
    await init_neo4j()
    await init_qdrant()

    db_gen = get_async_session()
    db = await anext(db_gen)
    driver = await get_neo4j_driver()
    qdrant = await get_qdrant_client()
    redis = await get_redis_client()
    
    try:
        # 2. Fetch all historical memories (idempotent, we just read from Postgres)
        # Note: Depending on the store implementations, we might need to query the DB directly.
        # For simplicity, let's query the `memories` table directly if `store.list()` isn't exposed.
        from sqlalchemy import text
        result = await db.execute(text("SELECT * FROM memories"))
        rows = result.fetchall()
        
        logger.info(f"Found {len(rows)} historical memories. Regenerating vectors and entities...")
        
        # Parse into Memory model
        from backend.models.memory import Memory, MemoryType
        from datetime import datetime
        import json
        
        memories = []
        for row in rows:
            m_dict = dict(row._mapping)
            # Basic parsing mapping
            m_type = MemoryType(m_dict['memory_type'])
            
            def safe_parse(val, default):
                if not val: return default
                if isinstance(val, str):
                    try: return json.loads(val)
                    except: return default
                return val
                
            memory = Memory(
                id=str(m_dict['id']),
                user_id=str(m_dict['user_id']),
                content=m_dict['content'],
                memory_type=m_type,
                created_at=m_dict['created_at'],
                updated_at=m_dict['updated_at'],
                importance_score=m_dict.get('importance_score', 0.0),
                emotional_weight=m_dict.get('emotional_weight', 0.0),
                embedding=safe_parse(m_dict.get('embedding'), []),
                entities=safe_parse(m_dict.get('entities'), []),
                metadata=safe_parse(m_dict.get('metadata_'), {})
            )
            memories.append(memory)
        
        user_ids = set()
        
        # 3. Publish Events for all historical memories
        logger.info(f"Found {len(memories)} historical memories. Publishing MemoryCreated events...")
        for memory in memories:
            logger.info(f"Publishing event for historical memory {memory.id}")
            await publish_event(DomainEvent(
                type=EventType.MemoryCreated,
                user_id=str(memory.user_id),
                payload={"memory": memory.model_dump(mode='json')}
            ))
            
        logger.info("Intelligence Backfill Complete! Events published.")

    finally:
        await db.close()
        await close_neo4j()
        await close_qdrant()

if __name__ == "__main__":
    asyncio.run(backfill())
