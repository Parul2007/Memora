import asyncio
import os
from dotenv import load_dotenv

load_dotenv("e:/memora_final/.env")

async def test_user_context():
    from backend.core.orchestration.bus import get_or_create_user_context
    import uuid
    user_id = uuid.UUID('00000000-0000-0000-0000-000000000001')
    try:
        user_ctx = await get_or_create_user_context(user_id)
        print("Success:", user_ctx)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test_user_context())
