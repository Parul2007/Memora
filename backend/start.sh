#!/bin/bash
echo "Starting Celery worker in the background..."
celery -A backend.workers.celery_app worker --loglevel=info --pool=solo -Q celery,indexing,consolidation,maintenance &

echo "Starting FastAPI web server..."
exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
