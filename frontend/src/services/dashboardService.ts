/**
 * src/services/dashboardService.ts
 *
 * Thin wrappers around apiFetch for all dashboard/insights endpoints.
 */

import { apiFetch } from './apiClient';

export interface DashboardSummary {
  total_memories: number;
  memories_by_type: Record<string, number>;
  active_goals: number;
  completed_goals: number;
  emotional_baseline: number;
  top_habits: string[];
  memory_health_score: number;
}

export interface MemoryActivityData {
  dates: string[];
  counts: number[];
}

export interface EmotionalHistoryData {
  dates: string[];
  values: number[];
}

export interface MemoryHealthBreakdown {
  healthy: number;
  fading: number;
  decayed: number;
}

export interface EntityItem {
  id: number | string;
  name: string;
  type: string;
  mentions: number;
  [key: string]: unknown;
}

export function fetchSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/api/dashboard/summary');
}

export function fetchMemoryActivity(): Promise<MemoryActivityData> {
  return apiFetch<MemoryActivityData>('/api/dashboard/memory-activity');
}

export function fetchEmotionalHistory(): Promise<EmotionalHistoryData> {
  return apiFetch<EmotionalHistoryData>('/api/dashboard/emotional-history');
}

export function fetchTopEntities(): Promise<EntityItem[]> {
  return apiFetch<EntityItem[]>('/api/dashboard/top-entities');
}

export function fetchMemoryHealthBreakdown(): Promise<MemoryHealthBreakdown> {
  return apiFetch<MemoryHealthBreakdown>('/api/dashboard/memory-health-breakdown');
}
