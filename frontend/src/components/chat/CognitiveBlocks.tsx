'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Target, Network, Database, BarChart3, LayoutDashboard, Compass, User } from 'lucide-react';

export function ScoreBadge({ score, colorOverride }: { score: number, colorOverride?: string }) {
  const clamp = Math.min(Math.max(score, 0), 1);
  const pct = Math.round(clamp * 100);
  const color = colorOverride || (pct >= 85 ? '#22c55e' : pct >= 65 ? '#f59e0b' : '#6366f1');

  return (
    <span style={{ fontSize: '10px', fontWeight: 700, color: color, backgroundColor: `${color}1A`, padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
      {pct}% MATCH
    </span>
  );
}

export function MemoryLearningCard({ data }: { data: any }) {
  const mem = data.memory;
  const status = data.status;
  const isPersisted = status === 'persisted';

  const type = mem?.memory_type?.toLowerCase() || 'semantic';
  let bg = '#dcfce7'; // Semantic (Pastel Green)
  let text = '#166534';
  let borderAlpha = '#16653440';
  let badgeBg = '#bbf7d0';

  if (type === 'episodic') {
    bg = '#f3e8ff'; // Pastel Purple
    text = '#6b21a8';
    borderAlpha = '#6b21a840';
    badgeBg = '#e9d5ff';
  } else if (type === 'emotional') {
    bg = '#ffe4e6'; // Pastel Pink
    text = '#be123c';
    borderAlpha = '#be123c40';
    badgeBg = '#fecdd3';
  } else if (type === 'procedural') {
    bg = '#e0f2fe'; // Pastel Blue
    text = '#0369a1';
    borderAlpha = '#0369a140';
    badgeBg = '#bae6fd';
  }

  return (
    <div style={{ backgroundColor: bg, border: `1px solid ${borderAlpha}`, borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isPersisted ? <CheckCircle2 size={14} color={text} /> : <FileText size={14} color={text} />}
          <span style={{ fontSize: '11px', fontWeight: 700, color: text, textTransform: 'uppercase' }}>
            {isPersisted ? 'Memory Persisted' : 'Memory Candidate'}
          </span>
        </div>
        {mem?.importance_score && <ScoreBadge score={mem.importance_score} colorOverride={text} />}
      </div>

      <p style={{ margin: 0, fontSize: '13px', color: '#1c1917', lineHeight: '1.5', fontWeight: 500 }}>
        {mem?.content}
      </p>

      {mem?.memory_type && (
        <div style={{ marginTop: '4px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: text, backgroundColor: badgeBg, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', border: `1px solid ${borderAlpha}` }}>
            {mem.memory_type}
          </span>
        </div>
      )}
    </div>
  );
}


export function KnowledgeGraphCard({ data }: { data: any }) {
  return (
    <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Network size={14} color="#0284c7" />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
          Knowledge Graph Updated
        </span>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: '#0ea5e9', fontWeight: 600, textTransform: 'uppercase' }}>Nodes</span>
          <span style={{ fontSize: '14px', color: '#0369a1', fontWeight: 700 }}>+{data.nodes_created}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: '#0ea5e9', fontWeight: 600, textTransform: 'uppercase' }}>Relations</span>
          <span style={{ fontSize: '14px', color: '#0369a1', fontWeight: 700 }}>+{data.relationships_created}</span>
        </div>
      </div>
    </div>
  );
}

export function MemoryRetrievalCard({ data }: { data: any }) {
  const mems = data.retrieved_memories || [];
  return (
    <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={14} color="#ca8a04" />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#a16207', textTransform: 'uppercase' }}>
            Context Retrieved
          </span>
        </div>
        <span style={{ backgroundColor: '#fef08a', color: '#854d0e', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '9999px' }}>
          {mems.length} FOUND
        </span>
      </div>

      {mems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {mems.map((m: any, i: number) => (
            <div key={i} style={{ backgroundColor: 'white', border: '1px solid #fde047', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#ca8a04', textTransform: 'uppercase' }}>Relevance</span>
                <ScoreBadge score={m.similarity} colorOverride="#854d0e" />
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#422006', lineHeight: '1.4' }}>
                {m.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface CognitiveBlock {
  id: string;
  type: 'learning' | 'graph' | 'retrieval';
  timestamp: string;
  data: any;
}

export function parseCognitiveBlocks(events: any[], prefix: string = '') {
  const result: CognitiveBlock[] = [];

  events.forEach((evt, idx) => {
    // Handle both frontend format (type) and backend DB format (event)
    const eventType = evt.type || evt.event;
    if (!eventType) return;

    // Use current time as fallback if timestamp is missing from DB
    const ts = evt.timestamp || new Date().toISOString();
    const blockId = prefix + ts + '-' + idx;

    if (eventType === 'retrieval_complete') {
      result.push({ id: blockId + '-retrieval', type: 'retrieval', timestamp: ts, data: evt.data });
    } else if (eventType === 'memory_candidate' || eventType === 'memory_created') {
      const existing = result.find(b => b.type === 'learning' && b.data.memory.content === evt.data.content);
      if (existing) {
        existing.data.memory = evt.data;
        existing.data.status = eventType === 'memory_created' ? 'persisted' : 'candidate';
      } else {
        result.push({
          id: blockId + '-learning',
          type: 'learning',
          timestamp: ts,
          data: { memory: evt.data, status: eventType === 'memory_created' ? 'persisted' : 'candidate' }
        });
      }
    } else if (eventType === 'graph_update') {
      result.push({ id: blockId + '-graph', type: 'graph', timestamp: ts, data: evt.data });
    }
  });

  return result;
}

// ─── Navigation Buttons ───────────────────────────────────────────────────

interface NavButton {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_BUTTONS: NavButton[] = [
  { label: 'Explore Graph', href: '/graph', icon: <Network size={16} /> },
  { label: 'Intelligence Explorer', href: '/explorer', icon: <Compass size={16} /> },
  { label: 'Memory Vault', href: '/memory', icon: <Database size={16} /> },
  { label: 'User Profile', href: '/profile', icon: <User size={16} /> },
];

export function CognitiveNavigation({ onNavigate }: { onNavigate?: (href: string) => void }) {
  const router = useRouter();

  const handleBlockClick = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    } else {
      router.push(href);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#78716c', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
        Quick Navigation
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', width: '100%' }}>
        {NAV_BUTTONS.map((btn) => (
          <button
            key={btn.href}
            onClick={() => handleBlockClick(btn.href)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: '10px',
              backgroundColor: '#f3e8ff', border: '1px solid #e9d5ff',
              color: '#6b21a8', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s', width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9d5ff';
              e.currentTarget.style.borderColor = '#d8b4fe';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3e8ff';
              e.currentTarget.style.borderColor = '#e9d5ff';
            }}
          >
            <span style={{ color: '#7e22ce', display: 'flex' }}>{btn.icon}</span>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}