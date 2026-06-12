import logging
from uuid import UUID
from backend.db.neo4j_client import get_neo4j_driver
from backend.db.postgres import AsyncSessionLocal
from sqlalchemy import text

logger = logging.getLogger(__name__)

class ExploreService:
    """
    Explore Service: Retrieval-oriented knowledge exposure.
    Does not generate new analytics or intelligence.
    """

    async def get_overview(self, user_id: UUID) -> dict:
        """Lightweight aggregate counts for future Explore landing views."""
        driver = await get_neo4j_driver()
        async with driver.session() as session:
            # People count
            res_people = await session.run(
                "MATCH (p:Entity {user_id: $uid, label: 'person'}) RETURN count(p) as count",
                uid=str(user_id)
            )
            people_rec = await res_people.single()
            people_count = people_rec["count"] if people_rec else 0

            # Project count
            res_proj = await session.run(
                "MATCH (p:Entity {user_id: $uid, label: 'product'}) RETURN count(p) as count",
                uid=str(user_id)
            )
            proj_rec = await res_proj.single()
            project_count = proj_rec["count"] if proj_rec else 0

            # Domain count (Using distinct labels as a simple domain grouping)
            res_dom = await session.run(
                "MATCH (e:Entity {user_id: $uid}) RETURN count(distinct e.label) as count",
                uid=str(user_id)
            )
            dom_rec = await res_dom.single()
            domain_count = dom_rec["count"] if dom_rec else 0

        # Workstreams count (derived from recent active memory clusters)
        # Using a fixed quick estimate for the overview, or running a light postgres query
        async with AsyncSessionLocal() as pg_session:
            recent_mems = await pg_session.execute(
                text("SELECT id FROM memories WHERE user_id = :uid ORDER BY updated_at DESC LIMIT 20"),
                {"uid": user_id}
            )
            mem_ids = [str(r.id) for r in recent_mems.fetchall()]

        active_workstreams = 0
        if mem_ids:
            async with driver.session() as session:
                res_ws = await session.run(
                    """
                    MATCH (m:Memory)<-[:MENTIONED_IN]-(e:Entity {user_id: $uid})
                    WHERE m.id IN $mem_ids
                    MATCH (e)-[:RELATED_TO]-(neighbor:Entity {user_id: $uid})
                    WITH neighbor, COUNT(DISTINCT m) as shared_memories
                    WHERE shared_memories > 1
                    RETURN count(neighbor) as count
                    """,
                    uid=str(user_id), mem_ids=mem_ids
                )
                ws_rec = await res_ws.single()
                active_workstreams = ws_rec["count"] if ws_rec else 0

        return {
            "people_count": people_count,
            "project_count": project_count,
            "domain_count": domain_count,
            "active_workstreams": active_workstreams
        }


    async def get_projects(self, user_id: UUID) -> dict:
        """Retrieve projects, associated people/tech, and memories."""
        driver = await get_neo4j_driver()
        async with driver.session() as session:
            result = await session.run(
                """
                MATCH (p:Entity {user_id: $uid})
                WHERE p.label = 'product' OR p.label = 'event'
                OPTIONAL MATCH (p)-[:RELATED_TO]-(neighbor:Entity)
                WITH p, collect(DISTINCT neighbor) as neighbors
                OPTIONAL MATCH (p)-[:MENTIONED_IN]->(m:Memory)
                WITH p, neighbors, COUNT(DISTINCT m) as memory_count
                ORDER BY memory_count DESC LIMIT 15
                RETURN p.text as title, 
                       [x in neighbors WHERE x.label = 'person' | x.text][0..5] as related_people,
                       [x in neighbors WHERE x.label IN ['tech', 'concept'] | x.text][0..5] as related_technologies,
                       memory_count
                """,
                uid=str(user_id)
            )
            rows = await result.data()
            
        projects = []
        for r in rows:
            title = r.get("title") or "Unknown Project"
            projects.append({
                "title": title.title(),
                "status": "Active" if r.get("memory_count", 0) > 0 else "Dormant",
                "evidence_count": r.get("memory_count", 0),
                "people": r.get("related_people", []),
                "technologies": r.get("related_technologies", [])
            })
            
        return {"projects": projects}

    async def get_domains(self, user_id: UUID) -> dict:
        """
        Derive domains using semantic tags / existing graph labels.
        Groups underlying entities by their broader semantic label to form domains.
        """
        driver = await get_neo4j_driver()
        async with driver.session() as session:
            result = await session.run(
                """
                MATCH (e:Entity {user_id: $uid})
                WHERE e.label IS NOT NULL AND e.label <> 'unknown'
                OPTIONAL MATCH (e)-[:RELATED_TO]-(neighbor:Entity)
                WITH e.label AS domain_name, COUNT(DISTINCT e) as node_count, COUNT(DISTINCT neighbor) as breadth
                ORDER BY node_count DESC LIMIT 10
                RETURN domain_name, node_count, breadth
                """,
                uid=str(user_id)
            )
            rows = await result.data()
            
        domains = []
        for r in rows:
            domains.append({
                "title": str(r["domain_name"]).capitalize() + " Domain",
                "activity": r["node_count"],
                "breadth": r["breadth"],
                "growth_rate": "Stable",
                "related_topics": []
            })
            
        return {"domains": domains}

    async def get_workstreams(self, user_id: UUID) -> dict:
        """
        Derive workstreams using recent memories, associated entities, and shared graph neighbors.
        """
        async with AsyncSessionLocal() as pg_session:
            recent_mems = await pg_session.execute(
                text("SELECT id, content FROM memories WHERE user_id = :uid ORDER BY updated_at DESC LIMIT 15"),
                {"uid": user_id}
            )
            mems = recent_mems.fetchall()
            mem_ids = [str(r.id) for r in mems]
            
        if not mem_ids:
            return {"workstreams": []}
            
        driver = await get_neo4j_driver()
        async with driver.session() as session:
            result = await session.run(
                """
                MATCH (m:Memory)<-[:MENTIONED_IN]-(e:Entity {user_id: $uid})
                WHERE m.id IN $mem_ids
                MATCH (e)-[:RELATED_TO]-(neighbor:Entity {user_id: $uid})
                WITH neighbor, COUNT(DISTINCT m) as shared_memories, COLLECT(DISTINCT e.text)[0..5] as dependencies
                WHERE shared_memories > 1
                ORDER BY shared_memories DESC LIMIT 8
                RETURN neighbor.text as title, shared_memories as activity_level, dependencies
                """,
                uid=str(user_id), mem_ids=mem_ids
            )
            rows = await result.data()
            
        workstreams = []
        for r in rows:
            title = r.get("title") or "Unknown Workstream"
            activity = r.get("activity_level", 0)
            workstreams.append({
                "title": title.title(),
                "activity_level": activity,
                "momentum": "High" if activity > 3 else "Moderate",
                "dependencies": r.get("dependencies", []),
                "evidence_count": activity
            })
            
        return {"workstreams": workstreams}
