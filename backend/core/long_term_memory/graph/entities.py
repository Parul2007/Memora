import logging
from uuid import UUID
from backend.models.memory import Memory
from backend.db.neo4j_client import get_neo4j_driver
from backend.core.knowledge_graph.graph_client import GraphClient
from backend.core.knowledge_graph.entity_linker import EntityLinker

logger = logging.getLogger(__name__)

async def update_memory_graph(memory: Memory) -> None:
    """
    Extracts entities from the memory and links them in Neo4j.
    """
    try:
        driver = await get_neo4j_driver()
        client = GraphClient(driver)
        linker = EntityLinker(client)
        
        # In a real pipeline, we would run LLM extraction here.
        # But `memory.entities` should already contain the LLM's raw strings.
        # We will parse them into the format EntityLinker expects.
        
        extracted_entities = []
        for e in memory.entities:
            # Simple heuristic mapping if it's just strings
            extracted_entities.append({
                "text": e,
                "label": "Concept",  # Default if not provided
                "score": 1.0         # Assumed high confidence if passed
            })
            
        await linker.process(memory, extracted_entities)
        
        logger.info(f"Graph updated for memory {memory.id}")
        
    except Exception as e:
        logger.error(f"Failed to update graph for memory {memory.id}: {e}")


async def delete_memory_graph(memory_id: UUID, user_id: UUID) -> None:
    """Removes a memory node and any newly orphaned entities from Neo4j."""
    try:
        driver = await get_neo4j_driver()
        client = GraphClient(driver)
        await client.delete_memory_node(memory_id, user_id)
        logger.info(f"Graph deleted for memory {memory_id}")
    except Exception as e:
        logger.error(f"Failed to delete graph for memory {memory_id}: {e}")
        raise
