import asyncio
import os
from dotenv import load_dotenv

load_dotenv("e:/memora_final/.env")

async def get_all_users():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    url = os.getenv("POSTGRES_URL")
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT id, display_name, preferences FROM users"))
            for row in res:
                print(row)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

asyncio.run(get_all_users())
