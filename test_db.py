import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

async def test_db():
    url = "postgresql+asyncpg://postgres.ymhjvrnukrfigpcdoisd:P%40rultiwari2007@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?ssl=require"
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            print("SUCCESSFULLY CONNECTED TO PORT 5432!")
    except Exception as e:
        print(f"FAILED 5432: {type(e).__name__} - {e}")
        
    url2 = "postgresql+asyncpg://postgres.ymhjvrnukrfigpcdoisd:P%40rultiwari2007@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?ssl=require"
    engine2 = create_async_engine(url2)
    try:
        async with engine2.begin() as conn:
            print("SUCCESSFULLY CONNECTED TO PORT 6543!")
    except Exception as e:
        print(f"FAILED 6543: {type(e).__name__} - {e}")

asyncio.run(test_db())
