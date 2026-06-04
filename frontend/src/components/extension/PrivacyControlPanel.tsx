'use client';
import React, { useState } from 'react';
import { Shield } from 'lucide-react';

export default function PrivacyControlPanel() {
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#11120D', margin: '0 0 20px 0' }}>What Memora captures</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#11120D' }}>Capture my messages</div>
            <div style={{ fontSize: '12px', color: '#78716c' }}>Save the prompts you write</div>
          </div>
          <div style={{ width: '40px', height: '24px', backgroundColor: '#22c55e', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#11120D' }}>Capture AI responses</div>
            <div style={{ fontSize: '12px', color: '#78716c' }}>Recommended for richer context</div>
          </div>
          <div style={{ width: '40px', height: '24px', backgroundColor: '#22c55e', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#11120D' }}>Incognito windows</div>
          <select style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px' }}>
            <option>Never</option>
            <option>Ask</option>
            <option>Always</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#11120D' }}>Min message length</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="range" min="20" max="500" defaultValue="50" style={{ width: '100px' }} />
            <span style={{ fontSize: '13px', color: '#78716c' }}>50 chars</span>
          </div>
        </div>
      </div>

      <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#11120D', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What we never capture</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        {['Passwords', 'Form data', 'Payment info', 'Files you download'].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#565449', backgroundColor: '#FAFAF9', padding: '6px 12px', borderRadius: '20px' }}>
            <Shield size={12} color="#10b981" /> {item}
          </div>
        ))}
      </div>

      <button 
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
        style={{ width: '100%', backgroundColor: 'white', border: '1px solid #e7e5e4', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}
      >
        {saved ? <span style={{ color: '#22c55e' }}>Saved ✓</span> : 'Update privacy settings'}
      </button>
    </div>
  );
}
