from dataclasses import dataclass
from typing import Any, Optional

from gliner import GLiNER
from sentence_transformers import CrossEncoder
from sentence_transformers import SentenceTransformer


@dataclass(slots=True)
class ModelRegistry:
    embedder: Optional[SentenceTransformer] = None
    ner_model: Optional[GLiNER] = None
    classifier: Optional[Any] = None
    reranker: Optional[CrossEncoder] = None
    nli_model: Optional[CrossEncoder] = None
    summarizer: Optional[Any] = None

    @property
    def loaded(self) -> bool:
        return True


model_registry = ModelRegistry()
