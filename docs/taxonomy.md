# Taxonomy

Memora forces extracted entities into a rigid Canonical Entity Taxonomy. Without a unified taxonomy, the knowledge graph degrades into disconnected noise (e.g., treating "Tim Cook", "Apple CEO", and "Timothy Cook" as separate entities of unknown types).

## Canonical Categories

Entities are classified into one of the following primary types:

* **person:** Human individuals (e.g., "Parul", "Elon Musk").
* **place:** Physical or geographical locations (e.g., "London", "DeepMind HQ").
* **organization:** Companies, institutions, or formal groups (e.g., "Google DeepMind", "Stanford").
* **date:** Temporal markers and specific timeframes (e.g., "2026", "Next Tuesday").
* **event:** Distinct occurrences or scheduled activities (e.g., "AI Conference 2026", "Meeting with Sarah").
* **product:** Software, hardware, or created artifacts (e.g., "Memora", "iPhone").
* **concept:** Abstract ideas, frameworks, or theoretical models (e.g., "Polyglot Persistence", "Memory OS").

## Rationale

By restricting entities to these high-level types, Memora achieves several architectural advantages:

1. **Deterministic Cypher Queries:** Neo4j traversal becomes predictable. We can reliably query `MATCH (p:person)-[:WORKS_AT]->(o:organization)` without guessing node labels.
2. **UI Predictability:** The frontend Graph UI assigns specific visual colors and physics weights based on the node's taxonomy class.
3. **Reasoning Engine Accuracy:** When the LLM reconstructs context, knowing that "Memora" is a `product` and not an `organization` allows it to generate logically coherent responses without hallucinating state.
