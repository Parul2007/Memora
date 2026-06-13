import asyncio

REDIS_URL = "rediss://default:gQAAAAAAAdsPAAIgcDE3NWQwZjEzMWY4NzQ0MGRmOTZiNGQ3MmZiODMyZWM3Mw@stable-walleye-121615.upstash.io:6379"

async def test_parse_url():
    import redis.asyncio as aioredis
    kwargs = aioredis.ConnectionPool.from_url(REDIS_URL).connection_kwargs
    print("Parsed kwargs:", kwargs)
    print("Connection class:", aioredis.ConnectionPool.from_url(REDIS_URL).connection_class)

asyncio.run(test_parse_url())
