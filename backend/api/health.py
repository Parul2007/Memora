import logging
import time
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from backend.dependencies import DatabaseSession, Neo4jDriverDep, QdrantClientDep, RedisClient
from backend.registry import model_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["System Health"])

APP_START_TIME = time.time()

@router.get("/live")
async def liveness_probe():
    """Simple HTTP ping to verify the server process is running."""
    return {"status": "ok", "uptime": round(time.time() - APP_START_TIME, 2)}

@router.get("/ready")
async def readiness_probe(
    db: DatabaseSession,
    neo4j: Neo4jDriverDep,
    qdrant: QdrantClientDep,
    redis: RedisClient
):
    """Deep readiness check validating all critical infrastructure connections."""
    health_status = {
        "status": "ok",
        "components": {}
    }
    
    is_ready = True
    
    # Check Postgres
    try:
        await db.execute(text("SELECT 1"))
        health_status["components"]["postgres"] = "ok"
    except Exception as e:
        logger.error(f"Postgres health check failed: {e}")
        health_status["components"]["postgres"] = "failed"
        is_ready = False
        
    # Check Neo4j
    try:
        async with neo4j.session() as session:
            await session.run("RETURN 1")
        health_status["components"]["neo4j"] = "ok"
    except Exception as e:
        logger.error(f"Neo4j health check failed: {e}")
        health_status["components"]["neo4j"] = "failed"
        is_ready = False
        
    # Check Redis
    try:
        await redis.ping()
        health_status["components"]["redis"] = "ok"
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        health_status["components"]["redis"] = "failed"
        is_ready = False
        
    # Check Qdrant
    try:
        # Just check collections list as a ping
        await qdrant.get_collections()
        health_status["components"]["qdrant"] = "ok"
    except Exception as e:
        logger.error(f"Qdrant health check failed: {e}")
        health_status["components"]["qdrant"] = "failed"
        is_ready = False
        
    # Check Model Registry
    try:
        health_status["components"]["models"] = "ok" if model_registry.loaded else "not_loaded"
    except Exception:
        health_status["components"]["models"] = "failed"

    if not is_ready:
        health_status["status"] = "degraded"
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=health_status)
        
    return health_status
