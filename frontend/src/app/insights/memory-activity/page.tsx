'use client';
import React from 'react';
import MemoryActivityChart from '../../../components/insights/MemoryActivityChart';

export default function MemoryActivityPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#11120D', margin: '0 0 8px 0', fontFamily: 'Playfair Display, serif' }}>Memory Activity</h1>
          <p style={{ fontSize: '14px', color: '#57534e', margin: 0 }}>A breakdown of memories captured over time, split by type.</p>
        </div>
        <div style={{ display: 'flex', backgroundColor: '#e7e5e4', padding: '4px', borderRadius: '8px' }}>
          <button style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: 'white', color: '#11120D', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>Daily</button>
          <button style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: '#78716c' }}>Weekly</button>
          <button style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: '#78716c' }}>Monthly</button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '32px', marginBottom: '32px' }}>
        <MemoryActivityChart height={500} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {[
          { label: 'Total Created', value: '142' },
          { label: 'Total Expired', value: '18' },
          { label: 'Most Active Day', value: 'Mar 12 (14)' },
          { label: 'Dominant Type', value: 'Episodic' }
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#11120D' }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
