'use client';
import React, { useState } from 'react';
import EmotionalJourneyChart from '../../../components/insights/EmotionalJourneyChart';

export default function EmotionalJourneyPage() {
  const [showAnnotations, setShowAnnotations] = useState(true);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#11120D', margin: '0 0 8px 0', fontFamily: 'Playfair Display, serif' }}>Emotional Journey</h1>
          <p style={{ fontSize: '14px', color: '#57534e', margin: 0 }}>Track the emotional valence of your conversations over time.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#11120D', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAnnotations} onChange={e => setShowAnnotations(e.target.checked)} /> Show annotations
          </label>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '32px', marginBottom: '32px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '16px', left: '32px', right: '32px', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 10 }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', letterSpacing: '0.05em' }}>POSITIVE</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em' }}>NEGATIVE</span>
        </div>
        <EmotionalJourneyChart height={450} showAnnotations={showAnnotations} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {[
          { label: 'Highest Point', value: '+0.8', sub: 'Mar 14 (Shipped feature)' },
          { label: 'Lowest Point', value: '-0.4', sub: 'Mar 12 (Frustrated with bug)' },
          { label: 'Average', value: '+0.25', sub: 'Trending positive' },
          { label: 'Volatility', value: 'High', sub: 'Large daily swings' }
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#11120D', marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#a8a29e' }}>{stat.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
