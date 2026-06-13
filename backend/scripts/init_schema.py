"""
backend/scripts/init_schema.py

Reads docker/init.sql and safely executes it against the configured database
to ensure all required schemas, tables, extensions, and triggers exist.
This script is idempotent.
"""

import asyncio
import logging
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from backend.config import settings

logger = logging.getLogger(__name__)

async def run_init_schema():
    logger.info("Starting automated database schema initialization...")
    
    # Resolve the path to docker/init.sql
    base_dir = Path(__file__).resolve().parent.parent.parent
    sql_file_path = base_dir / "docker" / "init.sql"
    
    if not sql_file_path.exists():
        logger.error(f"Schema initialization failed: {sql_file_path} not found.")
        return
        
    with open(sql_file_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Create a temporary engine just for schema initialization
    engine = create_async_engine(
        settings.postgres_url,
        echo=False,
        connect_args={"server_settings": {"statement_timeout": "60000"}},
    )
    
    try:
        async with engine.begin() as conn:
            # Execute the raw SQL statements bypassing SQLAlchemy prepared statements
            # which do not support multiple statements separated by semicolons.
            raw_conn = await conn.get_raw_connection()
            await raw_conn.driver_connection.execute(sql_content)
            
        logger.info("Database schema initialization completed successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database schema: {e}")
        raise
    finally:
        await engine.dispose()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_init_schema())
