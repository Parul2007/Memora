-- Migration V001: Add composite indexes for production performance
-- This migration is idempotent (safe to run multiple times)
-- Run concurrently to avoid table locks in production

-- ===================================================
-- Index 1: (user_id, memory_type, created_at DESC)
-- Purpose: Speeds up memory list/session queries filtered by type
-- Used by: memory.py list_memories, list_session_memories, stats, get_by_session
-- Production impact: Full table scan → index scan at 100K+ memories
-- ===================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memories_user_type_created
    ON memories (user_id, memory_type, created_at DESC);

-- ===================================================
-- Index 2: Partial index for active (non-expired) memories
-- Purpose: Speeds up queries that exclude expired memories
-- Used by: health checks, topic extraction, memory search
-- Production impact: ~50% reduction in scan size for active memories
-- ===================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memories_user_type_active
    ON memories (user_id, memory_type)
    WHERE expires_at IS NULL;

-- ===================================================
-- Index 3: (user_id, updated_at DESC)
-- Purpose: Speeds up session listing and recent activity queries
-- Used by: dashboard, session list endpoints
-- Production impact: Avoids full table sort for recently updated items
-- ===================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memories_user_updated
    ON memories (user_id, updated_at DESC);

-- ===================================================
-- Index 4: (session_id, created_at ASC)
-- Purpose: Speeds up message retrieval for a session
-- Used by: chat.py history, session_store fallback queries
-- Production impact: Avoids full table scan on message table
-- ===================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_session_created
    ON messages (session_id, created_at ASC);

-- ===================================================
-- Index 5: (user_id, memory_type, created_at DESC) on messages
-- Purpose: Index on emotional-timeline aggregation queries
-- Used by: memory.py get_emotional_timeline
-- Production impact: Speeds up AVG(emotional_weight) GROUP BY date queries
-- ===================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memories_emotional_timeline
    ON memories (user_id, memory_type, created_at)
    WHERE memory_type = 'emotional';