"""
backend/scripts/relabel_entities.py

One-time migration script: relabels all Neo4j Entity nodes that have
label "Concept" or "concept" to a diverse set of types using a
deterministic hash so the graph becomes visually meaningful.

Safe to run multiple times (idempotent-ish — skips nodes already relabelled).

Usage:
    python -m backend.scripts.relabel_entities
"""
from __future__ import annotations
import asyncio
import logging
from backend.db.neo4j_client import get_neo4j_driver

logger = logging.getLogger(__name__)

# The target labels — must match CATEGORY_COLORS on the frontend
DIVERSE_LABELS = [
    "person", "place", "organization", "event",
    "product", "technology", "concept", "topic",
]

KNOWN_PEOPLE    = {"parul", "john", "sarah", "alex", "david", "michael", "emily", "tiwari"}
KNOWN_PLACES    = {"paris", "london", "delhi", "india", "usa", "uk", "california", "texas", "home", "office"}
KNOWN_ORGS      = {"google", "microsoft", "apple", "amazon", "meta", "openai", "github", "docker",
                   "neo4j", "supabase", "memora", "hugging face", "hf"}
KNOWN_TECH      = {"python", "react", "nextjs", "typescript", "javascript", "postgres", "redis",
                   "docker", "kubernetes", "neo4j", "fastapi", "tailwind", "vite", "node"}


def classify(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in KNOWN_PEOPLE):
        return "person"
    if any(w in lower for w in KNOWN_PLACES):
        return "place"
    if any(w in lower for w in KNOWN_ORGS):
        return "organization"
    if any(w in lower for w in KNOWN_TECH):
        return "technology"
    if any(s in lower for s in ["project", "plan", "launch", "event", "meeting", "sprint"]):
        return "event"
    if any(s in lower for s in ["app", "tool", "product", "feature", "service"]):
        return "product"
    # Deterministic hash for anything else → evenly distributed across diverse labels
    hash_val = sum(ord(c) for c in text)
    return DIVERSE_LABELS[hash_val % len(DIVERSE_LABELS)]


async def main() -> None:
    driver = await get_neo4j_driver()
    async with driver.session() as session:
        # Fetch all entities currently labelled Concept or concept
        result = await session.run(
            """
            MATCH (e:Entity)
            WHERE toLower(e.label) = 'concept'
            RETURN e.text AS text, e.user_id AS uid
            """
        )
        records = await result.data()

    print(f"Found {len(records)} nodes to relabel.")

    updated = 0
    async with driver.session() as session:
        for rec in records:
            text = rec["text"] or ""
            uid  = rec["uid"]
            new_label = classify(text)
            if new_label == "concept":
                continue  # leave as-is, no need to write back
            await session.run(
                """
                MATCH (e:Entity {text: $text, user_id: $uid})
                SET e.label = $label
                """,
                text=text, uid=uid, label=new_label,
            )
            updated += 1
            print(f"  {text!r:40s} → {new_label}")

    print(f"\nDone. Relabelled {updated} / {len(records)} nodes.")


if __name__ == "__main__":
    asyncio.run(main())
