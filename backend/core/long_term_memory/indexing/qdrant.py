import logging
from backend.models.memory import Memory
from backend.db.qdrant_client import get_qdrant_client
from qdrant_client.models import PointIdsList, PointStruct

logger = logging.getLogger(__name__)

async def upsert_memory(memory: Memory) -> None:
    """
    Upserts a memory embedding into Qdrant for vector search.
    """
    try:
        if not memory.embedding or len(memory.embedding) == 0:
            logger.warning(f"No embedding found for memory {memory.id}. Skipping Qdrant upsert.")
            return
            
        client = await get_qdrant_client()
        
        point = PointStruct(
            id=str(memory.id),
            vector=memory.embedding,
            payload={
                "user_id": str(memory.user_id),
                "content": memory.content,
                "memory_type": memory.memory_type.value,
                "importance_score": memory.importance_score,
                "emotional_weight": memory.emotional_weight,
                "entities": memory.entities,
                "created_at": memory.created_at.isoformat() if memory.created_at else None,
                "updated_at": memory.updated_at.isoformat() if memory.updated_at else None,
            }
        )
        
        await client.upsert(
            collection_name="memories",
            points=[point]
        )
        
        logger.info(f"Successfully upserted memory {memory.id} to Qdrant")
        
    except Exception as e:
        logger.error(f"Failed to upsert memory {memory.id} to Qdrant: {e}")


async def delete_memory(memory_id: str) -> None:
    """Deletes a memory embedding from Qdrant."""
    try:
        client = await get_qdrant_client()
        await client.delete(
            collection_name="memories",
            points_selector=PointIdsList(points=[memory_id]),
        )
        logger.info(f"Successfully deleted memory {memory_id} from Qdrant")
    except Exception as e:
        logger.error(f"Failed to delete memory {memory_id} from Qdrant: {e}")
        raise
