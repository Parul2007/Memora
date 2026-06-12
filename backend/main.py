# main.py
# FastAPI application bootstrap for Memora.
# Owns application lifecycle, global ModelRegistry singleton,
# infrastructure initialization, router registration, health checks,
# structured logging, and graceful startup/shutdown behavior.

from __future__ import annotations

import logging
import sys
import time
from contextlib import asynccontextmanager
from typing import Any

import structlog
# import torch

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uuid
import structlog
from contextvars import ContextVar

correlation_id: ContextVar[str] = ContextVar("correlation_id", default="")


from backend.config import settings

from backend.db.postgres import init_db


APP_STARTED_AT = time.time()



def configure_logging() -> structlog.stdlib.BoundLogger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ],
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
    )

    return structlog.get_logger("memora")


logger = configure_logging()



def resolve_device() -> str:
    return "cpu"


ACTIVE_DEVICE = resolve_device()



from backend.registry import model_registry



def _timed_load(name: str, loader: callable) -> Any:
    start = time.perf_counter()

    logger.info(
        "Loading model",
        model=name,
    )

    try:
        model = loader()

        elapsed = (
            time.perf_counter()
            - start
        )

        logger.info(
            "Model loaded",
            model=name,
            seconds=round(elapsed, 2),
        )

        return model

    except Exception:
        logger.exception(
            "Model load failed",
            model=name,
        )
        raise


def load_models() -> None:
    logger.info(
        "Cloud-based Zero-Local-Models architecture active — bypassing local model loading"
    )



def register_router(
    app: FastAPI,
    module_path: str,
    prefix: str,
) -> None:
    try:
        module = __import__(
            module_path,
            fromlist=["router"],
        )

        app.include_router(
            module.router,
            prefix=prefix,
        )

        logger.info(
            "Router registered",
            router=module_path,
        )

    except Exception:
        logger.exception(
            "Router unavailable",
            router=module_path,
        )



@asynccontextmanager
async def lifespan(
    app: FastAPI,
):
    logger.info(
        "Starting Memora"
    )

    try:
        await init_db()
        
        from backend.db.neo4j_client import init_neo4j, close_neo4j
        from backend.db.qdrant_client import init_qdrant, close_qdrant
        await init_neo4j()
        await init_qdrant()

        load_models()

        from backend.core.events.event_router import start_event_router
        import asyncio
        # Start the background event router
        event_router_task = asyncio.create_task(start_event_router())

        yield
        
        event_router_task.cancel()
        await close_neo4j()
        await close_qdrant()

    except Exception:
        logger.exception(
            "Startup failed"
        )
        raise

    finally:
        logger.info(
            "Shutdown complete"
        )



# Rate limiter — per-IP rate limits for API protection.
# Uses Redis as storage backend for distributed rate limiting.
# Default: 120 requests/minute globally.
# Stricter limits applied per-endpoint in individual routers.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
    storage_uri=settings.redis_url,
)

app = FastAPI(
    title="Memora",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    correlation_id.set(req_id)
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=req_id,
        path=request.url.path,
        method=request.method,
    )
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log request completion metrics
    structlog.get_logger("memora").info(
        "http_request",
        status_code=response.status_code,
        duration_s=round(process_time, 4)
    )
    
    return response

@app.exception_handler(Exception)
async def global_exception_handler(
    request: Request,
    exc: Exception,
):
    logger.exception(
        "Unhandled exception",
        path=str(request.url),
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error"
        },
    )
register_router(
    app,
    "backend.api.chat",
    "",
)

register_router(
    app,
    "backend.api.dead_letter_queue_api",
    "",
)

register_router(
    app,
    "backend.api.memory",
    "",
)

register_router(
    app,
    "backend.api.dashboard",
    "",
)

register_router(
    app,
    "backend.api.graph",
    "",
)

register_router(
    app,
    "backend.api.explore",
    "",
)



register_router(
    app,
    "backend.api.sessions",
    "",
)

register_router(
    app,
    "backend.api.events",
    "/api",
)


register_router(
    app,
    "backend.api.health",
    "",
)