
import asyncio
from backend.core.orchestration.bus import get_or_create_user_context
import uuid

async def test():
    try:
        user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        await get_or_create_user_context(user_id)
        print("Success")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())

