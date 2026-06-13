import asyncio
import os
from dotenv import load_dotenv

load_dotenv("e:/memora_final/.env")
REDIS_URL = os.getenv("REDIS_URL", "").split("?")[0]

async def test_parse_url():
    import redis.asyncio as aioredis
    kwargs = aioredis.ConnectionPool.from_url(REDIS_URL).connection_kwargs
    print("Parsed kwargs:", kwargs)
    print("Connection class:", aioredis.ConnectionPool.from_url(REDIS_URL).connection_class)

asyncio.run(test_parse_url())
