-- Rollback V001: Remove composite indexes
-- Safe to run on any environment

DROP INDEX IF EXISTS idx_memories_user_type_created;
DROP INDEX IF EXISTS idx_memories_user_type_active;
DROP INDEX IF EXISTS idx_memories_user_updated;
DROP INDEX IF EXISTS idx_messages_session_created;
DROP INDEX IF EXISTS idx_memories_emotional_timeline;