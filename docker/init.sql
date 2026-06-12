-- init.sql
-- PostgreSQL bootstrap for Memora.
-- Runs once during first container initialization.
-- Creates extensions, schema objects, indexes, constraints,
-- update triggers, and grants required by backend services.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;



CREATE OR REPLACE FUNCTION updated_at_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;



CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    external_id VARCHAR(255) UNIQUE NOT NULL,

    display_name VARCHAR(255),

    persona_summary TEXT,

    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,

    emotional_baseline FLOAT DEFAULT 0.0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS
'Stores persistent user profile state and personalization settings.';



CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    title VARCHAR(255),

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    ended_at TIMESTAMPTZ,

    message_count INTEGER NOT NULL DEFAULT 0,

    is_consolidated BOOLEAN NOT NULL DEFAULT FALSE,

    is_starred BOOLEAN NOT NULL DEFAULT FALSE,

    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    summary TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE sessions IS
'Tracks conversation sessions and consolidation lifecycle.';





CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL,

    memory_type VARCHAR(20) NOT NULL
        CHECK (
            memory_type IN (
                'episodic',
                'semantic',
                'procedural',
                'emotional'
            )
        ),

    embedding VECTOR(1024) NOT NULL,

    importance_score FLOAT NOT NULL DEFAULT 0.5,

    emotional_weight FLOAT NOT NULL DEFAULT 0.0,

    decay_factor FLOAT NOT NULL DEFAULT 1.0,

    access_count INTEGER NOT NULL DEFAULT 0,

    last_accessed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ,

    is_consolidated BOOLEAN NOT NULL DEFAULT FALSE,

    source_session_id UUID
        REFERENCES sessions(id)
        ON DELETE SET NULL,

    entities JSONB NOT NULL DEFAULT '[]'::jsonb,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    CHECK (importance_score >= 0 AND importance_score <= 1),

    CHECK (emotional_weight >= -1 AND emotional_weight <= 1),

    CHECK (decay_factor >= 0)
);

COMMENT ON TABLE memories IS
'Stores long-term memory records with vector embeddings and consolidation metadata.';



CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL
        REFERENCES sessions(id)
        ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'complete',
    thinking_duration_ms INTEGER NOT NULL DEFAULT 0,
    token_count INTEGER NOT NULL DEFAULT 0,
    memories_retrieved JSONB NOT NULL DEFAULT '[]'::jsonb,
    parent_id UUID
);

COMMENT ON TABLE messages IS
'Stores all chat messages within conversation sessions.';

CREATE INDEX IF NOT EXISTS idx_messages_session
ON messages (session_id);

CREATE INDEX IF NOT EXISTS idx_messages_created
ON messages (created_at ASC);



CREATE UNIQUE INDEX IF NOT EXISTS idx_users_external_id
ON users (external_id);



CREATE INDEX IF NOT EXISTS idx_sessions_user
ON sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_consolidated
ON sessions (is_consolidated);





CREATE INDEX IF NOT EXISTS idx_memories_user
ON memories (user_id);

CREATE INDEX IF NOT EXISTS idx_memories_type
ON memories (memory_type);

CREATE INDEX IF NOT EXISTS idx_memories_created
ON memories (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memories_expires
ON memories (expires_at);

CREATE INDEX IF NOT EXISTS idx_memories_consolidated
ON memories (is_consolidated);



CREATE INDEX IF NOT EXISTS idx_memories_embedding
ON memories
USING ivfflat (
    embedding vector_cosine_ops
)
WITH (
    lists = 100
);



DROP TRIGGER IF EXISTS trg_users_updated_at
ON users;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE
ON users
FOR EACH ROW
EXECUTE FUNCTION updated_at_trigger();





DROP TRIGGER IF EXISTS trg_memories_updated_at
ON memories;

CREATE TRIGGER trg_memories_updated_at
BEFORE UPDATE
ON memories
FOR EACH ROW
EXECUTE FUNCTION updated_at_trigger();



GRANT ALL PRIVILEGES
ON ALL TABLES IN SCHEMA public
TO admin;

GRANT ALL PRIVILEGES
ON ALL SEQUENCES IN SCHEMA public
TO admin;

GRANT USAGE
ON SCHEMA public
TO admin;