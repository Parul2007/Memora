import asyncio
import os
from dotenv import load_dotenv

load_dotenv("e:/memora_final/.env")

async def check_users_table():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    url = os.getenv("POSTGRES_URL")
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT count(*) FROM users"))
            print(f"Users table exists, count={res.scalar()}")
            
            res = await conn.execute(text("SELECT count(*) FROM sessions"))
            print(f"Sessions table exists, count={res.scalar()}")
            
            res = await conn.execute(text("SELECT count(*) FROM messages"))
            print(f"Messages table exists, count={res.scalar()}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

asyncio.run(check_users_table())
