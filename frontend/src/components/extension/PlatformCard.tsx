import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function PlatformCard({ name, data }: { name: string, data: any }) {
  const percentage = Math.round(data.share * 100);

  return (
    <div style={{ 
      backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '20px', 
      flex: 1, display: 'flex', flexDirection: 'column', opacity: data.active ? 1 : 0.6 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#11120D', textTransform: 'capitalize' }}>
          {name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: data.active ? '#22c55e' : '#78716c' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: data.active ? '#22c55e' : '#d6d3d1' }} />
          {data.active ? 'On' : 'Paused'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: '#11120D' }}>{data.count}</span>
        <span style={{ fontSize: '13px', color: '#78716c' }}>memories</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ flex: 1, height: '4px', backgroundColor: '#f5f5f4', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#D8CFBC' }} />
        </div>
        <span style={{ fontSize: '12px', color: '#565449', fontWeight: 600 }}>{percentage}%</span>
      </div>

      <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '4px' }}>Last active: {data.lastActive}</div>
      <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '16px' }}>This week: {data.thisWeek} memories</div>

      <button style={{ 
        marginTop: 'auto', background: 'none', border: 'none', padding: 0, color: '#0284c7', 
        fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
      }}>
        View memories <ArrowRight size={14} />
      </button>
    </div>
  );
}
