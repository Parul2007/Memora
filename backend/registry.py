from dataclasses import dataclass
from typing import Any, Optional

@dataclass(slots=True)
class ModelRegistry:
    embedder: Optional[Any] = None
    ner_model: Optional[Any] = None
    classifier: Optional[Any] = None
    reranker: Optional[Any] = None
    nli_model: Optional[Any] = None
    summarizer: Optional[Any] = None

    @property
    def loaded(self) -> bool:
        return True


model_registry = ModelRegistry()
