# Architecture

Memora is a sophisticated Memory Operating System designed to provide persistent context generation and high-dimensional knowledge retrieval. Unlike traditional stateless LLM integrations, Memora relies on polyglot persistence, asynchronous background processing, and real-time event streaming to construct a living memory graph.

## System Overview

The system is decoupled into a frontend client, a unified API gateway, a background memory pipeline, and four specialized storage engines. This separation ensures that heavy NLP extraction tasks do not block the primary user experience.

## High Level Architecture

```mermaid
graph TD
    Client[Next.js Client] <-->|REST / SSE| API[FastAPI Gateway]
    
    subgraph Compute Layer
        API -->|Async Tasks| Celery[Celery Workers]
        Celery --> Extract[Entity Extraction Engine]
        Celery --> State[State Machine & Ledger]
    end
    
    subgraph Polyglot Persistence
        Extract -->|Vector Embeddings| Qdrant[(Qdrant)]
        Extract -->|Relationships| Neo4j[(Neo4j)]
        State -->|Chronological Log| PG[(PostgreSQL)]
    end
    
    subgraph Event Bus
        Celery -.->|Pub/Sub| Redis[(Redis)]
        Redis -.->|Event Stream| API
    end
```

## Component Responsibilities

* **Frontend (Next.js):** Manages user interaction, workspace rendering (Graph, Dashboard, Timeline), and global UI reactivity via Zustand and SSE.
* **API Gateway (FastAPI):** Exposes RESTful endpoints for memory ingestion, graph traversal, and chat. Acts as the SSE stream provider.
* **Background Pipeline (Celery):** Handles high-latency tasks such as embedding generation, LLM-based entity extraction, and knowledge graph construction.
* **Event Router (Redis/SSE):** Propagates state mutations from the background workers to the API gateway, which fans them out to connected clients.
* **Storage Engines:**
  * **PostgreSQL:** Source of truth for chronological ledgers, user accounts, and immutable state.
  * **Neo4j:** Property graph storing canonical entities and their multi-hop relationships.
  * **Qdrant:** High-performance vector database for semantic similarity search.

## Service Boundaries

Memora adheres to strict domain-driven service boundaries:
1. **Perception Layer:** Ingests raw unstructured text and normalizes it.
2. **Reasoning Layer:** Analyzes normalized data, determines cognitive routing (episodic vs. semantic), and extracts entities.
3. **Orchestration Layer:** Coordinates transaction commits across the polyglot databases.
4. **Presentation Layer:** Serves structured intelligence and context to the frontend or external LLMs.

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Pipeline
    participant DBs as Polyglot Stores
    
    User->>API: Send Unstructured Observation
    API->>Pipeline: Enqueue Processing Task
    API-->>User: 202 Accepted
    
    Pipeline->>Pipeline: Extract Entities & Intent
    Pipeline->>DBs: Write Vector (Qdrant)
    Pipeline->>DBs: Merge Graph (Neo4j)
    Pipeline->>DBs: Commit Ledger (Postgres)
    
    Pipeline->>API: Publish Event (via Redis)
    API-->>User: SSE: GraphUpdated
```
