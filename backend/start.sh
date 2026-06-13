#!/bin/bash

# start.sh - Entrypoint for Memora services

if [ "$1" = "worker" ]; then
    echo "Starting Celery worker in the foreground..."
    exec celery -A backend.workers.celery_app worker --loglevel=info --pool=solo -Q celery,indexing,consolidation,maintenance
elif [ "$1" = "web" ]; then
    echo "Initializing Database Schema..."
    python -m backend.scripts.init_schema
    
    echo "Starting FastAPI web server..."
    exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
else
    echo "Error: Must specify 'web' or 'worker' argument."
    echo "Usage: ./start.sh [web|worker]"
    exit 1
fi
