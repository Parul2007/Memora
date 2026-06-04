/**
 * src/services/goalsService.ts
 *
 * All backend calls related to Goals.
 * Import from here — never call apiFetch directly in components.
 */

import { apiFetch } from './apiClient';

export interface Milestone {
  id: string;
  title: string;
  status: 'pending' | 'completed';
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  progress: number;
  milestones: Milestone[];
}

export interface CreateGoalData {
  title: string;
  description: string;
  priority: string;
  target_date?: string;
}

/** GET /api/goals/ — returns list of all goals */
export async function fetchGoals(): Promise<Goal[]> {
  return apiFetch<Goal[]>('/api/goals/');
}

/** POST /api/goals/ — creates a new goal */
export async function createGoal(data: CreateGoalData): Promise<Goal> {
  return apiFetch<Goal>('/api/goals/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** PATCH /api/goals/{id} — updates progress or status */
export async function updateGoal(
  id: string,
  patch: { progress?: number; status?: string; milestones?: Milestone[] }
): Promise<Goal> {
  return apiFetch<Goal>(`/api/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** POST /api/goals/{id}/complete — marks a goal as complete */
export async function completeGoal(id: string): Promise<Goal> {
  return apiFetch<Goal>(`/api/goals/${id}/complete`, {
    method: 'POST',
  });
}

/** DELETE /api/goals/{id} — marks a goal as abandoned */
export async function abandonGoal(id: string): Promise<void> {
  return apiFetch<void>(`/api/goals/${id}`, {
    method: 'DELETE',
  });
}

/** POST /api/goals/{goalId}/milestone — adds a milestone to a goal */
export async function addMilestone(goalId: string, title: string): Promise<Goal> {
  return apiFetch<Goal>(`/api/goals/${goalId}/milestone`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}
