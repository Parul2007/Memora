/**
 * src/services/memoryService.ts
 *
 * Wraps all /api/memory/* backend endpoints and maps the backend response
 * shape to the frontend MemoryData shape used by MemoryGrid, MemoryList,
 * and MemoryTimeline.
 */

import { apiFetch } from './apiClient';
import { MemoryData } from './mockMemories';

// ── Backend shapes ────────────────────────────────────────────────────────────

export interface BackendMemory {
  id: string;
  content: string;
  memory_type: 'episodic' | 'semantic' | 'procedural' | 'emotional';
  importance_score: number;   // 0–1
  emotional_weight: number;
  entities: string[];
  decay_factor: number;       // 0–1
  access_count: number;
  created_at: string;         // ISO 8601
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface MemoryStats {
  episodic: number;
  semantic: number;
  procedural: number;
  emotional: number;
  total: number;
}

// ── Shape mapping ─────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'Last week';
  if (diffDays < 60) return 'Last month';
  return `${Math.floor(diffDays / 30)} months ago`;
}

function toMemoryData(b: BackendMemory): MemoryData {
  return {
    id: b.id,
    content: b.content,
    type: b.memory_type,
    importance: b.importance_score,
    decayFactor: b.decay_factor,
    accessed: b.access_count,
    timestamp: formatTimestamp(b.created_at),
    dateObj: new Date(b.created_at),
    tags: b.entities ?? [],
    source: 'Memora',
    pinned: b.metadata?.pinned ?? false,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fetch up to 50 memories and map to frontend shape. */
export async function fetchMemories(): Promise<MemoryData[]> {
  const data = await apiFetch<BackendMemory[]>('/api/memory/?limit=50');
  return data.map(toMemoryData);
}

/** Fetch aggregate memory type counts. */
export async function fetchMemoryStats(): Promise<MemoryStats> {
  return apiFetch<MemoryStats>('/api/memory/stats');
}

/** Fetch a single memory by id. */
export async function fetchMemory(id: string): Promise<MemoryData> {
  const data = await apiFetch<BackendMemory>(`/api/memory/${id}`);
  return toMemoryData(data);
}

/** Partially update a memory's content, importance score, or metadata. */
export async function updateMemory(
  id: string,
  patch: { content?: string; importance_score?: number; metadata?: Record<string, any> }
): Promise<MemoryData> {
  const data = await apiFetch<BackendMemory>(`/api/memory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return toMemoryData(data);
}

/** Delete a memory and return the server confirmation. */
export async function deleteMemory(id: string): Promise<void> {
  await apiFetch<{ status: string }>(`/api/memory/${id}`, { method: 'DELETE' });
}
