import pytest
from httpx import AsyncClient
from backend.main import app

import pytest_asyncio
from httpx import ASGITransport

@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
