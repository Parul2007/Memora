import React from 'react';
import { CheckCircle2, AlertCircle, Copy } from 'lucide-react';

export default function ExtensionStatusBanner({ status, onTogglePause }: { status: any, onTogglePause?: () => void }) {
  if (!status) return <div style={{ padding: '24px', background: 'white', borderRadius: '12px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e7e5e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          width: '12px', height: '12px', borderRadius: '50%', 
          backgroundColor: status.installed && !status.globalPause ? '#22c55e' : status.globalPause ? '#f59e0b' : '#ef4444' 
        }} />
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#11120D', margin: 0 }}>
            {status.installed ? (status.globalPause ? 'Extension Paused' : 'Extension Active') : 'Extension Not Detected'}
          </h2>
          {status.installed && (
            <div style={{ fontSize: '13px', color: '#78716c', marginTop: '4px' }}>
              Version {status.version} • Last sync: {status.lastSync}
            </div>
          )}
        </div>
      </div>
      
      {status.installed && (
        <button 
          onClick={onTogglePause}
          style={{ 
            backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', padding: '8px 16px', 
            borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#11120D', cursor: 'pointer' 
          }}
        >
          {status.globalPause ? '▶ Resume ingestion' : '⏸ Pause all ingestion'}
        </button>
      )}

      {!status.installed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button style={{ 
            backgroundColor: '#11120D', color: 'white', padding: '8px 16px', 
            borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' 
          }}>
            Install Extension
          </button>
        </div>
      )}
    </div>
  );
}
