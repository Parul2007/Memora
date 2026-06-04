import React from 'react';

export default function InsightCard({ icon, text }: { icon: string, text: string }) {
  return (
    <div style={{ backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', marginBottom: '12px' }}>
      <div style={{ fontSize: '20px' }}>{icon}</div>
      <p style={{ margin: 0, fontSize: '13px', color: '#11120D', lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}
