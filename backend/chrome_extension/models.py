"""
backend/chrome_extension/models.py

Request and response schemas for the Chrome extension API.
"""

from pydantic import BaseModel, Field
from typing import Optional


class ExtensionIngestRequest(BaseModel):
    platform: str = Field(
        ...,
        description="The platform being scraped (e.g., 'chatgpt', 'claude', 'gemini')"
    )
    user_prompt: str = Field(
        ...,
        description="The message the user sent to the AI"
    )
    ai_response: str = Field(
        ...,
        description="The response the AI generated"
    )
    url: Optional[str] = Field(
        None,
        description="Optional URL of the chat session"
    )

class ExtensionIngestResponse(BaseModel):
    status: str
    message: str
    memory_id: Optional[str] = None
    discarded: bool = False
