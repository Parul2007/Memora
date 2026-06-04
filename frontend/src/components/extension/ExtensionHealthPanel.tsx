import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

export default function ExtensionHealthPanel() {
  const checks = [
    { name: 'Extension installed', status: 'ok', detail: 'v1.0.2' },
    { name: 'API connection', status: 'ok', detail: 'Responding (48ms)' },
    { name: 'Auth token', status: 'ok', detail: 'Valid' },
    { name: 'Offline queue', status: 'ok', detail: 'Empty' },
    { name: 'ChatGPT scraper', status: 'ok', detail: 'Working' },
    { name: 'Claude scraper', status: 'ok', detail: 'Working' },
    { name: 'Gemini scraper', status: 'warn', detail: 'Needs update' },
  ];

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e7e5e4', backgroundColor: '#FAFAF9' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#11120D', margin: 0 }}>Extension Health</h3>
      </div>
      
      <div>
        {checks.map((check, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: i === checks.length - 1 ? 'none' : '1px solid #f5f5f4', fontSize: '13px' }}>
            <span style={{ color: '#565449' }}>{check.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: check.status === 'ok' ? '#22c55e' : '#f59e0b', fontWeight: 500 }}>
              {check.status === 'ok' ? <Check size={14} /> : <AlertTriangle size={14} />}
              {check.detail}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #e7e5e4', display: 'flex', gap: '12px' }}>
        <button style={{ flex: 1, backgroundColor: 'white', border: '1px solid #e7e5e4', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Run health check</button>
        <button style={{ flex: 1, backgroundColor: 'white', border: '1px solid #e7e5e4', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>View logs</button>
      </div>
    </div>
  );
}
