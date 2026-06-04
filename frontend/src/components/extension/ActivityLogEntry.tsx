import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

export default function ActivityLogEntry({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);

  if (entry.status === 'duplicate') {
    return (
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f5f4', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fafaf9' }}>
        <div style={{ backgroundColor: '#e7e5e4', color: '#565449', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Skipped</div>
        <span style={{ fontSize: '13px', color: '#78716c' }}>Duplicate conversation detected from {entry.platform}.</span>
      </div>
    );
  }

  if (entry.status === 'failed') {
    return (
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f5f4', opacity: 0.7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px', textTransform: 'capitalize', color: '#11120D' }}>
            {entry.platform} <span style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Failed: {entry.reason}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#78716c' }}>{entry.date}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', borderBottom: '1px solid #e7e5e4' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px', textTransform: 'capitalize', color: '#11120D' }}>
          {entry.platform} conversation
        </div>
        <div style={{ fontSize: '12px', color: '#78716c' }}>{entry.date}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#11120D', fontWeight: 500 }}>{entry.memories.length} memories saved</span>
        {entry.memories.map((m: string, i: number) => (
          <span key={i} style={{ backgroundColor: '#f5f5f4', color: '#565449', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{m}</span>
        ))}
      </div>

      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#0284c7', fontWeight: 500, marginBottom: '8px' }}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {expanded ? 'Hide conversation preview' : 'Expand conversation preview'}
      </div>

      {expanded && (
        <div style={{ backgroundColor: '#FAFAF9', padding: '12px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '13px', color: '#565449', marginBottom: '12px', fontStyle: 'italic' }}>
          "{entry.preview}"
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#78716c', marginTop: '12px' }}>
        <div><strong>Quality:</strong> <span style={{ color: entry.quality === 'High' ? '#22c55e' : entry.quality === 'Medium' ? '#f59e0b' : '#78716c' }}>{entry.quality}</span></div>
        <div><strong>Entities extracted:</strong> {entry.entities.join(', ') || 'None'}</div>
      </div>
    </div>
  );
}
