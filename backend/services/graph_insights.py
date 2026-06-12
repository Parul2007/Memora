import logging
from typing import Any
from uuid import UUID

from backend.core.knowledge_graph.graph_client import GraphClient

logger = logging.getLogger(__name__)

class GraphInsightsService:
    def __init__(self, graph_client: GraphClient):
        self.graph = graph_client

    async def get_overview(self, user_id: UUID) -> dict[str, Any]:
        """
        Generate high-level knowledge graph intelligence.
        """
        try:
            cypher = """
            // Total Entities
            MATCH (e:Entity {user_id: $uid})
            WITH COUNT(e) AS total_entities
            
            // Total Relationships
            OPTIONAL MATCH (:Entity {user_id: $uid})-[r:RELATED_TO]->(:Entity {user_id: $uid})
            WITH total_entities, COUNT(r) AS total_relationships
            
            // Strongest Entity (by mentions)
            OPTIONAL MATCH (se:Entity {user_id: $uid})-[:MENTIONED_IN]->(m:Memory)
            WITH total_entities, total_relationships, se, COUNT(m) AS se_mentions
            ORDER BY se_mentions DESC LIMIT 1
            WITH total_entities, total_relationships, {name: se.text, mentions: se_mentions} AS strongest_entity
            
            // Emerging Entities (recent growth)
            OPTIONAL MATCH (ee:Entity {user_id: $uid})-[:MENTIONED_IN]->(em:Memory)
            WITH total_entities, total_relationships, strongest_entity, ee, COUNT(em) AS ee_mentions, MAX(em.created_at) AS last_seen
            ORDER BY last_seen DESC, ee_mentions DESC LIMIT 5
            WITH total_entities, total_relationships, strongest_entity, COLLECT({name: ee.text, growth_score: ee_mentions}) AS emerging_entities
            
            // Strongest Relationships
            OPTIONAL MATCH (a:Entity {user_id: $uid})-[r:RELATED_TO]->(b:Entity {user_id: $uid})
            // Compute dynamic strength: shared memories
            OPTIONAL MATCH (a)-[:MENTIONED_IN]->(shared_m:Memory)<-[:MENTIONED_IN]-(b)
            WITH total_entities, total_relationships, strongest_entity, emerging_entities, a, b, COUNT(DISTINCT shared_m) AS shared_memories
            WITH total_entities, total_relationships, strongest_entity, emerging_entities, a, b, (shared_memories + 1) AS computed_strength
            ORDER BY computed_strength DESC LIMIT 5
            WITH total_entities, total_relationships, strongest_entity, emerging_entities, COLLECT({source: a.text, target: b.text, strength: computed_strength}) AS strongest_relationships
            
            RETURN total_entities, total_relationships, strongest_entity, emerging_entities, strongest_relationships
            """
            
            async with self.graph.driver.session() as session:
                result = await session.run(cypher, uid=str(user_id))
                record = await result.single()
                
            if not record:
                return {
                    "total_entities": 0,
                    "total_relationships": 0,
                    "strongest_entity": {"name": "None", "mentions": 0},
                    "emerging_entities": [],
                    "strongest_relationships": []
                }
                
            # Clean up potentially null strongest_entity
            se = record["strongest_entity"]
            if not se or not se.get("name"):
                se = {"name": "None", "mentions": 0}
                
            return {
                "total_entities": record["total_entities"],
                "total_relationships": record["total_relationships"],
                "strongest_entity": se,
                "emerging_entities": record["emerging_entities"] or [],
                "strongest_relationships": record["strongest_relationships"] or []
            }
        except Exception as exc:
            logger.error(f"Failed to get graph overview: {exc}")
            return {
                "total_entities": 0,
                "total_relationships": 0,
                "strongest_entity": {"name": "None", "mentions": 0},
                "emerging_entities": [],
                "strongest_relationships": []
            }
