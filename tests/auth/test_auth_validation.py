"""
tests/auth/test_auth_validation.py

Validates the FastAPI dependency injection layer for authentication.
Ensures valid JWTs are accepted and invalid/missing JWTs are properly rejected.

Production File: backend/dependencies.py
Runtime Path: Any protected API endpoint.
Feature Protected: Authentication and protected API access.
"""

import jwt
import pytest
from fastapi import HTTPException
from fastapi import status
from uuid import UUID

from backend.dependencies import get_current_user
from backend.config import settings

@pytest.mark.asyncio
async def test_missing_jwt_rejected(monkeypatch):
    # Ensure development mode is off to prevent dummy token bypass
    monkeypatch.setattr(settings, "app_env", "production")
    
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token=None)
        
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Authentication required"

@pytest.mark.asyncio
async def test_invalid_jwt_rejected(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "supabase_jwt_secret", "test_secret")
    
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token="invalid.token.string")
        
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Invalid token" in exc_info.value.detail

@pytest.mark.asyncio
async def test_valid_hs256_jwt_accepted(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "supabase_jwt_secret", "test_secret")
    
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    token = jwt.encode(
        {"sub": user_id},
        "test_secret",
        algorithm="HS256"
    )
    
    result = await get_current_user(token=token)
    assert isinstance(result, UUID)
    assert str(result) == user_id
