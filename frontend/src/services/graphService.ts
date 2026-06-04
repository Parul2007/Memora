/**
 * src/services/graphService.ts
 *
 * Graph data fetching service.
 * Wraps GET /api/graph/ using the central apiFetch client.
 */

import { apiFetch } from './apiClient';

export interface GraphNode {
  id: string;
  name: string;
  type: 'person' | 'place' | 'org' | 'concept' | 'goal' | 'event' | 'habit';
  val: number;
  mentions: number;
  firstSeen?: string;
  lastSeen?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function fetchGraph(): Promise<GraphData> {
  return apiFetch<GraphData>('/api/graph/');
}
