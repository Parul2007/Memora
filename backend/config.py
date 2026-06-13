"""
backend/config.py

Centralized application configuration.

This is the ONLY module allowed to read environment variables.
All other backend modules must import configuration through:

    from backend.config import settings
"""

from __future__ import annotations


from pydantic import Field
from pydantic import field_validator
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # HuggingFace

    hf_api_token: str | None = Field(
        default=None,
        alias="HF_API_TOKEN",
    )

    # PostgreSQL

    postgres_url: str = Field(
        default=(
            "postgresql+asyncpg://"
            "admin:password@localhost/memory_ai"
        ),
        alias="POSTGRES_URL",
    )

    @field_validator("postgres_url", mode="after")
    @classmethod
    def validate_postgres_url(cls, v: str) -> str:
        # Supabase specific fixes to ensure asyncpg and Session pooler
        if "supabase" in v:
            if ":6543" in v:
                raise ValueError(
                    "Supabase Transaction Mode detected.\n"
                    "Memora requires Session Mode (5432) because asyncpg prepared statements are used."
                )
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Redis

    redis_url: str = Field(
        default="redis://localhost:6379",
        alias="REDIS_URL",
    )

    # Qdrant

    qdrant_url: str = Field(
        default="http://localhost:6333",
        alias="QDRANT_URL",
    )

    qdrant_collection_name: str = Field(
        default="memories",
    )

    qdrant_api_key: str | None = Field(
        default=None,
        alias="QDRANT_API_KEY",
    )

    # Neo4j

    neo4j_uri: str = Field(
        default="bolt://localhost:7687",
        alias="NEO4J_URI",
    )

    neo4j_user: str = Field(
        default="neo4j",
        alias="NEO4J_USER",
    )

    neo4j_password: str = Field(
        default="password",
        alias="NEO4J_PASSWORD",
    )

    # Supabase

    supabase_url: str = Field(
        default="",
        alias="SUPABASE_URL",
    )

    supabase_anon_key: str = Field(
        default="",
        alias="SUPABASE_ANON_KEY",
    )

    supabase_jwt_secret: str = Field(
        default="",
        alias="SUPABASE_JWT_SECRET",
    )

    # Models

    embedding_model_name: str = Field(
        default="BAAI/bge-large-en-v1.5",
        alias="EMBEDDING_MODEL_NAME",
    )

    embedding_dims: int = Field(
        default=1024,
        alias="EMBEDDING_DIMS",
    )

    ner_model_name: str = Field(
        default="gliner-community/gliner_large-v2.5",
        alias="NER_MODEL_NAME",
    )

    classification_model_name: str = Field(
        default="facebook/bart-large-mnli",
        alias="CLASSIFICATION_MODEL_NAME",
    )

    reranker_model_name: str = Field(
        default="BAAI/bge-reranker-v2-m3",
        alias="RERANKER_MODEL_NAME",
    )

    nli_model_name: str = Field(
        default="cross-encoder/nli-deberta-v3-large",
        alias="NLI_MODEL_NAME",
    )

    summarizer_model_name: str = Field(
        default="facebook/bart-large-cnn",
        alias="SUMMARIZER_MODEL_NAME",
    )

    llm_model_name: str = Field(
        default="Qwen/Qwen2.5-72B-Instruct",
        alias="LLM_MODEL_NAME",
    )

    llm_fast_model_name: str = Field(
        default="Qwen/Qwen2.5-7B-Instruct",
        alias="LLM_FAST_MODEL_NAME",
    )

    local_model_cache_dir: str = Field(
        default="./.model_cache",
        alias="MODEL_CACHE_DIR",
    )

    device: str = Field(
        default="cpu",
        alias="DEVICE",
    )

    # Application

    app_env: str = Field(
        default="development",
        alias="APP_ENV",
    )

    log_level: str = Field(
        default="INFO",
        alias="LOG_LEVEL",
    )

    hot_cache_ttl_seconds: int = Field(
        default=3600,
        alias="HOT_CACHE_TTL_SECONDS",
    )

    warm_store_days: int = Field(
        default=30,
        alias="WARM_STORE_DAYS",
    )

    importance_threshold: float = Field(
        default=0.4,
        alias="IMPORTANCE_THRESHOLD",
    )

    decay_rate: float = Field(
        default=0.01,
        alias="DECAY_RATE",
    )

    max_context_memories: int = Field(
        default=8,
        alias="MAX_CONTEXT_MEMORIES",
    )

    max_retrieval_candidates: int = Field(
        default=15,
        alias="MAX_RETRIEVAL_CANDIDATES",
    )

    max_session_messages: int = Field(
        default=20,
        alias="MAX_SESSION_MESSAGES",
    )

    @field_validator("embedding_dims")
    @classmethod
    def validate_embedding_dims(
        cls,
        value: int,
    ) -> int:
        if value != 1024:
            raise ValueError(
                "embedding_dims must be 1024 — "
                "bge-large-en-v1.5 outputs "
                "1024 dimensions, not 1536"
            )

        return value

    @field_validator("hf_api_token")
    @classmethod
    def validate_hf_api_token(
        cls,
        value: str | None,
    ) -> str | None:
        return value

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


settings = Settings()

print(
    f"Config loaded: "
    f"env={settings.app_env}, "
    f"device={settings.device}"
)

__all__ = [
    "Settings",
    "settings",
]