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
import torch

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


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
    if settings.device != "auto":
        return settings.device

    if torch.cuda.is_available():
        return "cuda"

    if (
        hasattr(torch.backends, "mps")
        and torch.backends.mps.is_available()
    ):
        return "mps"

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

    except ImportError:
        logger.warning(
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

        load_models()

        yield

    except Exception:
        logger.exception(
            "Startup failed"
        )
        raise

    finally:
        logger.info(
            "Shutdown complete"
        )



app = FastAPI(
    title="Memora",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



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
    "backend.api.memory",
    "",
)

register_router(
    app,
    "backend.api.goals",
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
    "backend.chrome_extension.router",
    "/api/extension",
)

register_router(
    app,
    "backend.api.sessions",
    "",
)



@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "models_loaded": model_registry.loaded,
        "device": ACTIVE_DEVICE,
        "uptime": round(
            time.time()
            - APP_STARTED_AT,
            2,
        ),
    }