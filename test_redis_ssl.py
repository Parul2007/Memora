import asyncio
import os
from dotenv import load_dotenv

load_dotenv("e:/memora_final/.env")
REDIS_URL = os.getenv("REDIS_URL", "").split("?")[0]

async def test_redis():
    try:
        import redis.asyncio as aioredis
        # Test the kwargs that redis-py 5.0.4 will accept
        pool = aioredis.ConnectionPool.from_url(
            REDIS_URL,
            decode_responses=True,
            ssl_cert_reqs="none"  # This is the string 'none', not ssl.CERT_NONE
        )
        r = aioredis.Redis(connection_pool=pool)
        await r.ping()
        await r.aclose()
        await pool.disconnect()
        print("Success with string 'none'")
    except Exception as e:
        print(f"Failed with string 'none': {type(e)} {e}")

    try:
        import ssl
        pool2 = aioredis.ConnectionPool.from_url(
            REDIS_URL,
            decode_responses=True,
            ssl_cert_reqs=ssl.CERT_NONE  # This is the enum
        )
        r2 = aioredis.Redis(connection_pool=pool2)
        await r2.ping()
        await r2.aclose()
        await pool2.disconnect()
        print("Success with ssl.CERT_NONE")
    except Exception as e:
        print(f"Failed with ssl.CERT_NONE: {type(e)} {e}")

asyncio.run(test_redis())
