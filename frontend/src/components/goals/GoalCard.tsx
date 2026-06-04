'use client';
import React, { useState } from 'react';
import { MoreHorizontal, Plus, CheckCircle2, Circle } from 'lucide-react';
import { updateGoal, addMilestone } from '../../services/goalsService';

interface GoalCardProps {
  goal: any;
  onComplete?: (e: React.MouseEvent) => void;
  onAbandon?: (e: React.MouseEvent) => void;
}

export default function GoalCard({ goal, onComplete, onAbandon }: GoalCardProps) {
  const [milestones, setMilestones] = useState(goal.milestones);
  const [progress, setProgress] = useState(goal.progress);

  const toggleMilestone = async (id: string) => {
    const updated = milestones.map((m: any) => {
      if (m.id === id) {
        return { ...m, status: m.status === 'completed' ? 'pending' : 'completed' };
      }
      return m;
    });
    setMilestones(updated);
    
    // Recalculate progress
    const completedCount = updated.filter((m: any) => m.status === 'completed').length;
    const newProgress = Math.round((completedCount / updated.length) * 100);
    setProgress(newProgress);
    
    try {
      await updateGoal(goal.id, { progress: newProgress, milestones: updated });
    } catch (e) {
      alert('Failed to update milestone on server');
    }
  };

  const handleAddMilestone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const title = prompt('Enter milestone title:');
    if (!title) return;
    
    try {
      const updatedGoal = await addMilestone(goal.id, title);
      setMilestones(updatedGoal.milestones);
      setProgress(updatedGoal.progress);
    } catch (e) {
      alert('Failed to add milestone');
    }
  };

  return (
    <div style={{ 
      backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', 
      padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      transition: 'box-shadow 0.2s ease', cursor: 'pointer'
    }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#11120D', margin: 0 }}>{goal.title}</h2>
            <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: goal.priority === 'HIGH' ? '#fef2f2' : '#f0fdf4', color: goal.priority === 'HIGH' ? '#ef4444' : '#16a34a' }}>
              {goal.priority}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: goal.status === 'On track' ? '#22c55e' : '#f59e0b' }}>
              [{goal.status}]
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#57534e', margin: 0 }}>{goal.description}</p>
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e' }}>
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, height: '8px', backgroundColor: '#f5f5f4', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#11120D', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#11120D', width: '36px' }}>{progress}%</div>
        <div style={{ fontSize: '12px', color: '#78716c' }}>Due in {goal.dueDate}</div>
      </div>

      {/* Milestones */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '12px' }}>MILESTONES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {milestones.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => { e.stopPropagation(); toggleMilestone(m.id); }}>
              {m.status === 'completed' ? (
                <CheckCircle2 size={16} color="#22c55e" style={{ cursor: 'pointer' }} />
              ) : (
                <Circle size={16} color="#d6d3d1" style={{ cursor: 'pointer' }} />
              )}
              <span style={{ fontSize: '13px', color: m.status === 'completed' ? '#a8a29e' : '#1c1917', textDecoration: m.status === 'completed' ? 'line-through' : 'none', flex: 1 }}>
                {m.title}
              </span>
              <span style={{ fontSize: '12px', color: '#a8a29e' }}>{m.date}</span>
              {m.status === 'at risk' && (
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 500 }}>[at risk]</span>
              )}
              {m.status === 'overdue' && (
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 500 }}>[overdue]</span>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', color: '#0284c7', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} onClick={handleAddMilestone}>
            <Plus size={16} /> Add milestone
          </div>
        </div>
      </div>

      {/* Habits Linked */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '12px' }}>HABITS LINKED</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {goal.linkedHabits.map((habit: string, i: number) => (
            <div key={i} style={{ padding: '4px 10px', backgroundColor: '#f5f5f4', borderRadius: '16px', fontSize: '12px', color: '#57534e', fontWeight: 500 }}>
              [{habit}]
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#78716c', borderTop: '1px solid #f5f5f4', paddingTop: '16px' }}>
        <span>💡 {goal.linkedMemoriesCount} relevant memories</span>
        <span>·</span>
        <span>Last updated {goal.lastUpdated}</span>
        {onComplete && (
          <button onClick={onComplete} style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 600, color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Complete</button>
        )}
        {onAbandon && (
          <button onClick={onAbandon} style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Abandon</button>
        )}
      </div>
    </div>
  );
}
