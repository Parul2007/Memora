import asyncio
import redis.asyncio as aioredis

REDIS_URL = "rediss://default:gQAAAAAAAdsPAAIgcDE3NWQwZjEzMWY4NzQ0MGRmOTZiNGQ3MmZiODMyZWM3Mw@stable-walleye-121615.upstash.io:6379"

async def test_upstash():
    try:
        pool = aioredis.ConnectionPool.from_url(
            REDIS_URL,
            decode_responses=True,
            ssl_cert_reqs="none"
        )
        r = aioredis.Redis(connection_pool=pool)
        await r.ping()
        await r.aclose()
        await pool.disconnect()
        print("Success! ssl_cert_reqs='none' works for rediss://")
    except Exception as e:
        print(f"Failed: {type(e)} {e}")

asyncio.run(test_upstash())
