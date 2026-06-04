"""
backend/api/graph.py

Knowledge graph read API.

Returns nodes (entities) and edges (relationships) from Neo4j
for the frontend force-directed graph visualization.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.dependencies import get_current_user
from backend.db.neo4j_client import get_neo4j_driver

router = APIRouter(
    prefix="/api/graph",
    tags=["graph"],
)


class GraphNode(BaseModel):
    id: str
    name: str
    type: str
    mentions: int
    val: float  # sizing hint for force graph


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    strength: int


class GraphData(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


@router.get("/", response_model=GraphData)
async def get_graph(
    current_user: UUID = Depends(get_current_user),
):
    """
    Return all Entity nodes and RELATED_TO edges for the
    authenticated user from Neo4j.
    """
    try:
        driver = await get_neo4j_driver()

        async with driver.session() as session:
            # Fetch entity nodes
            node_result = await session.run(
                """
                MATCH (e:Entity {user_id: $uid})
                RETURN
                    e.id        AS id,
                    e.text      AS name,
                    e.type      AS type,
                    e.mentions  AS mentions
                ORDER BY e.mentions DESC
                LIMIT 100
                """,
                uid=str(current_user),
            )
            node_records = await node_result.data()

            # Fetch relationship edges between those nodes
            edge_result = await session.run(
                """
                MATCH (a:Entity {user_id: $uid})-[r]->(b:Entity {user_id: $uid})
                RETURN
                    elementId(r)      AS id,
                    a.id              AS source,
                    b.id              AS target,
                    type(r)           AS label,
                    r.strength        AS strength
                LIMIT 200
                """,
                uid=str(current_user),
            )
            edge_records = await edge_result.data()

        nodes = [
            GraphNode(
                id=r["id"] or r["name"],
                name=r["name"],
                type=r.get("type", "concept"),
                mentions=r.get("mentions") or 1,
                val=max(1.0, (r.get("mentions") or 1) / 10),
            )
            for r in node_records
            if r.get("id") and r.get("name")
        ]

        edges = [
            GraphEdge(
                id=str(r["id"]),
                source=r["source"],
                target=r["target"],
                label=r.get("label", "related"),
                strength=int(r.get("strength") or 1),
            )
            for r in edge_records
            if r.get("source") and r.get("target")
        ]

        return GraphData(nodes=nodes, edges=edges)

    except Exception:
        # Neo4j unavailable — return empty graph gracefully
        return GraphData(nodes=[], edges=[])
