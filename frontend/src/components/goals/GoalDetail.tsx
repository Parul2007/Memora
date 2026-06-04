'use client';
import React from 'react';
import { BrainCircuit, MessageSquare, ArrowLeft, Plus } from 'lucide-react';

export default function GoalDetail({ goal, onBack }: { goal: any, onBack: () => void }) {
  return (
    <div style={{ backgroundColor: 'white', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header & Back */}
      <div style={{ padding: '24px 40px', borderBottom: '1px solid #e7e5e4' }}>
        <button 
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#57534e', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: '24px' }}
        >
          <ArrowLeft size={16} /> Back to active goals
        </button>

        <input 
          type="text" 
          defaultValue={goal.title} 
          style={{ fontSize: '32px', fontWeight: 700, color: '#11120D', border: 'none', width: '100%', outline: 'none', backgroundColor: 'transparent', marginBottom: '16px', fontFamily: 'Playfair Display, serif' }} 
        />
        
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em' }}>DESCRIPTION</span>
            <input type="text" defaultValue={goal.description} style={{ fontSize: '14px', color: '#57534e', border: 'none', outline: 'none', minWidth: '300px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em' }}>PRIORITY</span>
            <select defaultValue={goal.priority} style={{ fontSize: '14px', color: '#11120D', border: 'none', outline: 'none', fontWeight: 500 }}>
              <option>HIGH</option><option>MED</option><option>LOW</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em' }}>STATUS</span>
            <select defaultValue={goal.status} style={{ fontSize: '14px', color: '#11120D', border: 'none', outline: 'none', fontWeight: 500 }}>
              <option>On track</option><option>At risk</option><option>Overdue</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ padding: '40px', flex: 1 }}>
        {/* Big Progress */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#11120D' }}>Progress</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#11120D' }}>{goal.progress}%</span>
          </div>
          <div style={{ width: '100%', height: '16px', backgroundColor: '#f5f5f4', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${goal.progress}%`, backgroundColor: '#11120D' }} />
          </div>
        </div>

        {/* AI Insight Box */}
        <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '24px', marginBottom: '40px', display: 'flex', gap: '16px' }}>
          <BrainCircuit size={24} color="#0284c7" style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1', margin: '0 0 8px 0' }}>AI Insight</h3>
            <p style={{ fontSize: '13px', color: '#0c4a6e', margin: 0, lineHeight: 1.5 }}>
              Based on your recent conversations, you're <strong>highly motivated but spreading yourself thin</strong>. Notably: you mentioned feeling burnt out in a recent chat, but you still added two new milestones to this goal. Consider pacing yourself to stay on track.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '40px' }}>
          {/* Milestones full list */}
          <div style={{ flex: 2 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#11120D', margin: '0 0 16px 0' }}>Milestones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {goal.milestones.map((m: any) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e7e5e4', borderRadius: '8px', backgroundColor: '#FAFAF9' }}>
                  <input type="checkbox" defaultChecked={m.status === 'completed'} style={{ width: '16px', height: '16px' }} />
                  <input type="text" defaultValue={m.title} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', color: m.status === 'completed' ? '#a8a29e' : '#1c1917', textDecoration: m.status === 'completed' ? 'line-through' : 'none' }} />
                  <span style={{ fontSize: '13px', color: '#78716c' }}>{m.date}</span>
                </div>
              ))}
              <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', border: '1px dashed #d6d3d1', borderRadius: '8px', background: 'none', color: '#57534e', fontSize: '13px', fontWeight: 500, cursor: 'pointer', justifyContent: 'center' }}>
                <Plus size={16} /> Add milestone
              </button>
            </div>
          </div>

          {/* Connected Context */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#11120D', margin: '0 0 16px 0' }}>Linked Context</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '12px' }}>HABITS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {goal.linkedHabits.map((h: string, i: number) => (
                  <div key={i} style={{ padding: '12px', backgroundColor: '#f5f5f4', borderRadius: '8px', fontSize: '13px', color: '#1c1917', fontWeight: 500 }}>
                    {h}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '12px' }}>MEMORIES</div>
              <div style={{ padding: '16px', backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '13px', color: '#57534e', fontStyle: 'italic' }}>
                "I really need to figure out the backend architecture this weekend..."
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Fixed Chat Button Bottom */}
      <div style={{ borderTop: '1px solid #e7e5e4', padding: '24px 40px', backgroundColor: 'white' }}>
        <button style={{ width: '100%', backgroundColor: '#11120D', color: 'white', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <MessageSquare size={18} /> Start a chat about this goal &rarr;
        </button>
      </div>

    </div>
  );
}
