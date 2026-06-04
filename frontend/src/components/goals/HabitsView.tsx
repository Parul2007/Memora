import React from 'react';
import { Activity, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function HabitsView() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#11120D', margin: '0 0 8px 0', fontFamily: 'Playfair Display, serif' }}>AI Detected Habits</h1>
        <p style={{ fontSize: '14px', color: '#57534e', margin: 0 }}>
          Memora detected these patterns in your conversations — without you having to log anything.
        </p>
      </div>

      <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#FAFAF9', border: '1px dashed #e7e5e4', borderRadius: '12px' }}>
        <p style={{ color: '#78716c', fontSize: '14px' }}>AI detected habits will appear here as you use Memora.</p>
      </div>
    </div>
  );
}
