'use client';
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { fetchGoals, Goal, updateGoal } from '../../services/goalsService';

export default function MilestonesView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals()
      .then(setGoals)
      .catch(err => setError(err.message || 'Failed to load milestones.'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const updatedMilestones: any[] = goal.milestones.map(m => {
      if (m.id === milestoneId) {
        return { ...m, status: m.status === 'completed' ? 'pending' : 'completed' };
      }
      return m;
    });

    const completedCount = updatedMilestones.filter(m => m.status === 'completed').length;
    const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);

    // Optimistic update
    setGoals(goals.map(g => g.id === goalId ? { ...g, milestones: updatedMilestones, progress: newProgress } : g));

    try {
      await updateGoal(goalId, { progress: newProgress, milestones: updatedMilestones });
    } catch (e) {
      alert('Failed to update milestone on server');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#11120D', margin: 0, fontFamily: 'Playfair Display, serif' }}>All Milestones</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px' }}>
            <option>All Status</option>
            <option>Pending</option>
            <option>Completed</option>
          </select>
          <button style={{ backgroundColor: '#11120D', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Mark selected as done
          </button>
        </div>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', color: '#78716c', fontSize: '14px' }}>Loading milestones…</p>
      )}

      {error && (
        <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '14px' }}>{error}</p>
      )}

      {!loading && !error && goals.length === 0 && (
        <p style={{ textAlign: 'center', color: '#78716c', fontSize: '14px' }}>No milestones found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {goals.map(goal => (
          <div key={goal.id} style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', backgroundColor: '#FAFAF9', borderBottom: '1px solid #e7e5e4' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#11120D', margin: 0 }}>{goal.title}</h3>
            </div>
            <div>
              {goal.milestones.map((m: any, i: number) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderBottom: i === goal.milestones.length - 1 ? 'none' : '1px solid #f5f5f4' }}>
                  <input 
                    type="checkbox" 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                    checked={m.status === 'completed'} 
                    onChange={() => handleToggleMilestone(goal.id, m.id)}
                  />
                  <div style={{ flex: 1, fontSize: '14px', color: m.status === 'completed' ? '#a8a29e' : '#1c1917', textDecoration: m.status === 'completed' ? 'line-through' : 'none' }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#78716c' }}>{m.date}</div>
                  <div style={{ width: '80px', textAlign: 'right' }}>
                    {m.status === 'completed' && <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>Done</span>}
                    {m.status === 'pending' && <span style={{ fontSize: '11px', color: '#78716c', fontWeight: 600 }}>Pending</span>}
                    {m.status === 'at risk' && <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>At Risk</span>}
                    {m.status === 'overdue' && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>Overdue</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
