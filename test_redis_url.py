import asyncio
import os
from dotenv import load_dotenv

load_dotenv("e:/memora_final/.env")
REDIS_URL = os.getenv("REDIS_URL", "").split("?")[0]

async def test_redis():
    try:
        import redis.asyncio as aioredis
        url_with_param = f"{REDIS_URL}?ssl_cert_reqs=none"
        pool = aioredis.ConnectionPool.from_url(
            url_with_param,
            decode_responses=True,
        )
        r = aioredis.Redis(connection_pool=pool)
        await r.ping()
        await r.aclose()
        await pool.disconnect()
        print("Success with ?ssl_cert_reqs=none in URL")
    except Exception as e:
        print(f"Failed with ?ssl_cert_reqs=none in URL: {type(e)} {e}")

asyncio.run(test_redis())
