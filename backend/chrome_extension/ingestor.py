"""
backend/chrome_extension/ingestor.py

Logic for passively ingesting conversation data from external platforms.
"""

import logging
from uuid import UUID

from backend.chrome_extension.models import ExtensionIngestRequest
from backend.core.perception.parser import parse
from backend.core.long_term_memory.ingestion.gateway import (
    MemoryIngestionGateway,
    IngestionDiscardedError,
)
from backend.models.memory import MemoryCreate

logger = logging.getLogger(__name__)

async def process_extension_ingest(
    request: ExtensionIngestRequest,
    user_id: UUID
) -> tuple[str | None, bool]:
    """
    Processes passive ingestion from the Chrome extension.
    Returns (memory_id, discarded_boolean)
    """
    # Combine the context into a single memory block
    combined_text = f"Context from {request.platform.capitalize()}:\nUser: {request.user_prompt}\nAI: {request.ai_response}"
    
    # 1. Perception (Semantic Classification, GLiNER Entity Extraction, BGE Embedding)
    logger.info(f"Running perception for passive ingestion from {request.platform}")
    perception = await parse(
        text=combined_text,
        session_id=user_id, # Using user_id as a fallback session ID
        user_id=user_id
    )
    
    # Extract string values from entities list
    entity_strings = []
    if perception.entities:
        for ent in perception.entities:
            if isinstance(ent, dict) and "text" in ent:
                entity_strings.append(ent["text"])
            elif isinstance(ent, str):
                entity_strings.append(ent)
                
    # 2. Ingestion (Deduplication, Importance Scoring, Qdrant & Neo4j sync)
    memory_create = MemoryCreate(
        user_id=user_id,
        content=combined_text,
        memory_type=perception.memory_type,
        importance_score=0.5, # The gateway recalculates this based on the entities/embedding
        emotional_weight=0.0,
        entities=list(set(entity_strings)),
        embedding=perception.embedding,
        metadata={
            "source": request.platform,
            "passive_ingestion": True,
            "url": request.url
        }
    )
    
    gateway = MemoryIngestionGateway()
    
    try:
        memory = await gateway.ingest(memory_create)
        if memory:
            return str(memory.id), False
        return None, True
    except IngestionDiscardedError:
        logger.info("Memory discarded during passive ingestion.")
        return None, True
    except Exception as exc:
        logger.error(f"Passive ingestion failed: {exc}")
        raise
