'use client';
import React, { useState, useEffect } from 'react';
import { fetchGoals, createGoal, completeGoal, abandonGoal, Goal } from '../../services/goalsService';
import GoalCard from '../../components/goals/GoalCard';
import GoalDetail from '../../components/goals/GoalDetail';
import { useProtectedRoute } from '../../lib/useProtectedRoute';
import AccessDenied from '../../components/AccessDenied';

export default function GoalsPage() {
  const { isReady } = useProtectedRoute();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  async function loadGoals() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchGoals();
      setGoals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load goals.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  if (!isReady) return <AccessDenied pageName="Goals" />;

  async function handleNewGoal() {
    const title = prompt('Goal title:');
    if (!title) return;
    const description = prompt('Description:') || '';
    const priority = prompt('Priority (HIGH / MED / LOW):') || 'MED';
    const target_date = prompt('Target date (YYYY-MM-DD) or leave blank:') || undefined;
    try {
      const newGoal = await createGoal({ title, description, priority, target_date });
      setGoals(prev => [newGoal, ...prev]);
    } catch (err: any) {
      alert('Error creating goal: ' + err.message);
    }
  }

  async function handleComplete(id: string) {
    try {
      const updated = await completeGoal(id);
      setGoals(prev => prev.map(g => g.id === id ? updated : g));
    } catch (err: any) {
      alert('Error completing goal: ' + err.message);
    }
  }

  async function handleAbandon(id: string) {
    if (!confirm('Mark this goal as abandoned?')) return;
    try {
      await abandonGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err: any) {
      alert('Error abandoning goal: ' + err.message);
    }
  }

  if (selectedGoal) {
    return (
      <div style={{ margin: '-40px', minHeight: 'calc(100vh - 84px)' }}>
        <GoalDetail goal={selectedGoal} onBack={() => setSelectedGoal(null)} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#11120D', margin: 0, fontFamily: 'Playfair Display, serif' }}>Active Goals</h1>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', backgroundColor: 'white' }}>
            <option>Sort: Priority</option>
            <option>Sort: Target date</option>
            <option>Sort: Progress</option>
            <option>Sort: Date created</option>
          </select>
          <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', backgroundColor: 'white' }}>
            <option>Filter: All</option>
            <option>Filter: On track</option>
            <option>Filter: At risk</option>
            <option>Filter: Overdue</option>
          </select>
          <button
            onClick={handleNewGoal}
            style={{ backgroundColor: '#11120D', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            + New Goal
          </button>
        </div>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading goals…</p>
      )}

      {error && (
        <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '14px' }}>{error}</p>
      )}

      {!loading && !error && goals.length === 0 && (
        <p style={{ textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No active goals yet. Create one to get started.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {goals.map(goal => (
          <div key={goal.id} onClick={() => setSelectedGoal(goal)}>
            <GoalCard
              goal={goal}
              onComplete={(e) => { e.stopPropagation(); handleComplete(goal.id); }}
              onAbandon={(e) => { e.stopPropagation(); handleAbandon(goal.id); }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
