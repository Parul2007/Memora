#!/bin/bash

# start.sh - Entrypoint for Memora services
# Uses the first argument, or RAILWAY_SERVICE_ROLE env var, defaulting to 'web'
ROLE=${1:-${RAILWAY_SERVICE_ROLE:-web}}

if [ "$ROLE" = "worker" ]; then
    echo "Starting Celery worker in the foreground..."
    exec celery -A backend.workers.celery_app worker --loglevel=info --pool=solo -Q celery,indexing,consolidation,maintenance
elif [ "$ROLE" = "web" ]; then
    echo "Initializing Database Schema..."
    python -m backend.scripts.init_schema
    
    echo "Starting FastAPI web server..."
    exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
else
    echo "Error: Must specify 'web' or 'worker' argument/role."
    echo "Usage: ./start.sh [web|worker]"
    exit 1
fi
