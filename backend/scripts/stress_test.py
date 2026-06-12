import asyncio
import logging
import sys
import uuid
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.db.postgres import get_async_session
from backend.db.neo4j_client import get_neo4j_driver, init_neo4j, close_neo4j
from backend.db.qdrant_client import get_qdrant_client, init_qdrant, close_qdrant
from backend.db.redis_client import get_redis_client
from backend.core.long_term_memory.ingestion.gateway import MemoryIngestionGateway


logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

USER_ID = "00000000-0000-0000-0000-000000000000"  # Test user ID

async def run_stress_test():
    logger.info("Starting Phase 6 Real Data Stress Test...")
    
    await init_neo4j()
    await init_qdrant()

    db_gen = get_async_session()
    db = await anext(db_gen)
    driver = await get_neo4j_driver()
    qdrant = await get_qdrant_client()
    redis = await get_redis_client()
    
    gateway = MemoryIngestionGateway(db, driver, qdrant)
    orchestrator = IntelligenceOrchestrator(driver, db, qdrant, redis)

    messages = [
        "I am building Memora using FastAPI and Neo4j.",
        "I want to become an AI Engineer.",
        "I study AI every morning.",
        "I am redesigning the Memora graph architecture.",
        "I prefer FastAPI over Django."
    ]

    for msg in messages:
        logger.info(f"Ingesting: {msg}")
        await gateway.process_message(uuid.UUID(USER_ID), msg)
        await asyncio.sleep(2) # Give events time to propagate and async tasks to finish
        
    logger.info("Ingestion complete. Regenerating intelligence snapshot...")
    snapshot = await orchestrator.get_or_generate_intelligence(USER_ID, force_refresh=True)
    
    import json
    logger.info("Intelligence Snapshot Output:")
    print(json.dumps(snapshot, indent=2, default=str))

    await db.close()
    await close_neo4j()
    await close_qdrant()

if __name__ == "__main__":
    asyncio.run(run_stress_test())
