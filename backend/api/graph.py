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
from backend.core.knowledge_graph.graph_client import GraphClient
from backend.services.graph_insights import GraphInsightsService

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
                OPTIONAL MATCH (e)-[:MENTIONED_IN]->(m:Memory)
                RETURN
                    e.text      AS id,
                    e.text      AS name,
                    e.label     AS type,
                    COUNT(m)    AS mentions
                ORDER BY mentions DESC
                LIMIT 100
                """,
                uid=str(current_user),
            )
            node_records = await node_result.data()

            # Fetch relationship edges between those nodes
            edge_result = await session.run(
                """
                MATCH (a:Entity {user_id: $uid})-[r]->(b:Entity {user_id: $uid})
                WHERE type(r) <> 'MENTIONED_IN'
                RETURN
                    elementId(r)      AS id,
                    a.text            AS source,
                    b.text            AS target,
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
                type=(r.get("type") or "concept").lower().strip(),
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
                label=r.get("label") or "related",
                strength=int(r.get("strength") or 1),
            )
            for r in edge_records
            if r.get("source") and r.get("target")
        ]

        return GraphData(nodes=nodes, edges=edges)

    except Exception:
        # Neo4j unavailable — return empty graph gracefully
        return GraphData(nodes=[], edges=[])

@router.get("/overview")
async def get_overview(current_user: UUID = Depends(get_current_user)):
    try:
        driver = await get_neo4j_driver()
        client = GraphClient(driver)
        insights = GraphInsightsService(client)
        return await insights.get_overview(current_user)
    except Exception as e:
        return {"error": str(e)}

@router.get("/entities")
async def get_entities(
    current_user: UUID = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    label: str = ""
):
    try:
        driver = await get_neo4j_driver()
        cypher = """
        MATCH (e:Entity {user_id: $uid})
        WHERE ($search = '' OR toLower(e.text) CONTAINS toLower($search))
          AND ($label = '' OR e.label = $label)
        OPTIONAL MATCH (e)-[:MENTIONED_IN]->(m:Memory)
        OPTIONAL MATCH (e)-[:RELATED_TO]-(neighbor:Entity {user_id: $uid})
        WITH e, COUNT(DISTINCT m) AS mentions, COUNT(DISTINCT neighbor) AS relationships
        ORDER BY mentions DESC
        SKIP $skip LIMIT $limit
        RETURN
            e.text AS name,
            e.label AS label,
            mentions,
            relationships,
            e.updated_at AS updated_at
        """
        async with driver.session() as session:
            result = await session.run(cypher, uid=str(current_user), search=search, label=label, skip=skip, limit=limit)
            rows = await result.data()
            
            # Get total count for pagination
            count_cypher = """
            MATCH (e:Entity {user_id: $uid})
            WHERE ($search = '' OR toLower(e.text) CONTAINS toLower($search))
              AND ($label = '' OR e.label = $label)
            RETURN COUNT(e) AS total
            """
            count_result = await session.run(count_cypher, uid=str(current_user), search=search, label=label)
            count_record = await count_result.single()
            total = count_record["total"] if count_record else 0
            
        return {"entities": [dict(row) for row in rows], "total": total}
    except Exception as e:
        return {"error": str(e)}

@router.get("/entity/{entity_name}")
async def get_entity_profile(
    entity_name: str,
    current_user: UUID = Depends(get_current_user)
):
    try:
        driver = await get_neo4j_driver()
        client = GraphClient(driver)
        
        # 1. Get stats
        context = await client.get_entity_context(entity_name, current_user)
        if not context:
            return {"error": "Entity not found"}
            
        # 2. Get Related
        neighbors = await client.get_entity_neighbors(entity_name, current_user)
        
        # 3. Get Memories
        memories_cypher = """
        MATCH (e:Entity {text: $name, user_id: $uid})-[:MENTIONED_IN]->(m:Memory)
        RETURN m.id AS id, m.type AS type, m.importance AS importance, toString(m.created_at) AS created_at
        ORDER BY m.created_at DESC
        """
        async with driver.session() as session:
            m_result = await session.run(memories_cypher, name=entity_name, uid=str(current_user))
            m_rows = await m_result.data()
            
        return {
            "entity": {"name": context["text"], "label": context["label"]},
            "stats": {"mentions": context["mentions"], "relationships": context["relationships"], "updated_at": context["updated_at"]},
            "related_entities": neighbors,
            "memory_references": [dict(r) for r in m_rows],
            "timeline": [dict(r) for r in m_rows]
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/entity/{entity_name}/context")
async def get_entity_full_context(
    entity_name: str,
    current_user: UUID = Depends(get_current_user)
):
    # This endpoint is required for future unified intelligence phases
    try:
        profile = await get_entity_profile(entity_name, current_user)
        if "error" in profile:
            return profile
            
        return {
            "entity": profile["entity"],
            "memories": profile["memory_references"],
            "related_entities": profile["related_entities"],
            "timeline": profile["timeline"],
            "inferred_topics": [] # Placeholder for Phase 5 topic inference
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/memory/{memory_id}/context")
async def get_memory_graph_context(
    memory_id: str,
    current_user: UUID = Depends(get_current_user)
):
    try:
        driver = await get_neo4j_driver()
        cypher = """
        MATCH (e:Entity {user_id: $uid})-[:MENTIONED_IN]->(m:Memory {id: $mid})
        OPTIONAL MATCH (e)-[r:RELATED_TO]-(neighbor:Entity {user_id: $uid})
        RETURN 
            e.text AS entity,
            e.label AS label,
            m.id AS memory_id,
            m.type AS memory_type,
            m.importance AS memory_importance,
            toString(m.created_at) AS memory_created_at,
            COLLECT(DISTINCT {text: neighbor.text, label: neighbor.label, strength: r.strength})[0..5] AS related_concepts
        """
        async with driver.session() as session:
            result = await session.run(cypher, uid=str(current_user), mid=memory_id)
            rows = await result.data()
            
        entities = []
        for row in rows:
            entities.append({
                "name": row["entity"],
                "label": row["label"],
                "related": [r for r in row["related_concepts"] if r and r.get("text")],
                "memory_references": [
                    {
                        "id": row["memory_id"],
                        "type": row["memory_type"],
                        "importance": float(row["memory_importance"] or 0),
                        "created_at": row["memory_created_at"]
                    }
                ] if row.get("memory_id") else []
            })
            
        return {"entities": entities}
    except Exception as e:
        return {"error": str(e)}
