from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
import uuid

class EventType(str, Enum):
    MemoryCreated = "MemoryCreated"
    MemoryUpdated = "MemoryUpdated"
    MemoryDeleted = "MemoryDeleted"
    EntityCreated = "EntityCreated"
    EntityUpdated = "EntityUpdated"
    GraphUpdated = "GraphUpdated"
    IntelligenceUpdated = "IntelligenceUpdated"
    EvolutionUpdated = "EvolutionUpdated"
    PredictionUpdated = "PredictionUpdated"


class DomainEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: EventType
    user_id: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=lambda: __import__('time').time())
