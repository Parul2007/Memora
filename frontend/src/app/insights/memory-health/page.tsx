'use client';
import React from 'react';
import MemoryHealthDonut from '../../../components/insights/MemoryHealthDonut';
import { MOCK_WEAK_MEMORIES } from '../../../services/mockInsightsData';
import { AlertTriangle, Zap } from 'lucide-react';

export default function MemoryHealthPage() {
  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#11120D', margin: '0 0 8px 0', fontFamily: 'Playfair Display, serif' }}>Memory Health</h1>
        <p style={{ fontSize: '14px', color: '#57534e', margin: 0 }}>Review memories that are fading according to the Ebbinghaus forgetting curve.</p>
      </div>

      <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px 24px', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '32px', color: '#b91c1c' }}>
        <AlertTriangle size={20} />
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Warning: 2 High-importance Semantic memories are at risk of expiring.</span>
      </div>

      <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
        <div style={{ flex: 1, backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '32px' }}>
          <MemoryHealthDonut height={300} />
        </div>
        
        <div style={{ flex: 1, backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#11120D', margin: '0 0 24px 0' }}>Health by Type</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {['Episodic', 'Semantic', 'Procedural'].map((type, i) => (
              <div key={type}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#11120D' }}>
                  <span>{type}</span>
                  <span>{i === 0 ? '92%' : i === 1 ? '64%' : '88%'} Healthy</span>
                </div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: i === 0 ? '92%' : i === 1 ? '64%' : '88%', backgroundColor: '#22c55e' }} />
                  <div style={{ width: i === 0 ? '5%' : i === 1 ? '20%' : '10%', backgroundColor: '#f59e0b' }} />
                  <div style={{ flex: 1, backgroundColor: '#ef4444' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#11120D', marginBottom: '16px' }}>Memories Needing Reinforcement</h2>
        <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAFAF9', color: '#78716c', textAlign: 'left', borderBottom: '1px solid #e7e5e4', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Memory Preview</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Importance</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Decay</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_WEAK_MEMORIES.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '16px 24px', color: '#11120D', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.preview}</td>
                  <td style={{ padding: '16px 24px', color: '#57534e' }}>{m.type}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: m.importance === 'High' ? '#fee2e2' : '#fef3c7', color: m.importance === 'High' ? '#b91c1c' : '#92400e', fontSize: '12px', fontWeight: 600 }}>
                      {m.importance}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#ef4444', fontWeight: 600 }}>{m.decay}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', backgroundColor: '#11120D', color: 'white', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      <Zap size={12} /> Reinforce
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
