# Deployment

Memora relies on multiple microservices and distributed storage engines. To eliminate "it works on my machine" issues, the entire stack is containerized using Docker and Docker Compose.

## Architecture

* **Frontend Container:** Next.js application built using Alpine Node.
* **Backend Container:** FastAPI server running via Uvicorn.
* **Worker Container:** Celery worker running identical Python backend image logic.
* **Storage Containers:** PostgreSQL (pgvector), Neo4j, Qdrant, and Redis.

## Docker Orchestration

The `docker/docker-compose.yml` file is the source of truth for local deployment.
It provisions an isolated bridge network (`memora-net`) and manages dependency startup ordering using strict `healthcheck` conditions.

```bash
cd docker
docker compose up --build
```

### Startup Flow

1. **Base Services:** Redis, Qdrant, and Postgres boot up.
2. **Graph Init:** Neo4j boots and waits for port availability.
3. **Health Validation:** The backend container waits until Postgres, Redis, and Neo4j pass their health checks (e.g., `pg_isready`).
4. **API Boot:** FastAPI initializes. The lifespan hook executes `init_neo4j()` and `init_qdrant()`.
5. **Workers:** Celery workers attach to the Redis broker.
6. **Frontend:** The Next.js container binds to port 3000 and connects to the backend API.

## Environment Variables

The stack relies on a `.env` file mounted into the containers. Critical variables include:
* `POSTGRES_URL`
* `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
* `QDRANT_URL`
* `REDIS_URL`

## Production Deployment

For production (`docker-compose.prod.yml` and `Dockerfile.frontend.prod`), the architecture changes:
* **Frontend:** Built statically and served via a lightweight Nginx container rather than the Next.js dev server.
* **Backend:** Scaled behind Gunicorn with multiple Uvicorn workers.
* **Security:** Ports for Neo4j and Postgres are not exposed externally, locked within the private `memora-net` bridge.
