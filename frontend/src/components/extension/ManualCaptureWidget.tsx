'use client';
import React, { useState } from 'react';

export default function ManualCaptureWidget() {
  const [content, setContent] = useState('');
  
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#11120D', margin: '0 0 4px 0' }}>Save anything to Memora</h3>
      <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 16px 0' }}>Paste or type something to save as a memory...</p>
      
      <textarea 
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="E.g., A quote, an idea, or a snippet from a website..."
        style={{ width: '100%', height: '100px', padding: '12px', boxSizing: 'border-box', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '13px', resize: 'none', marginBottom: '12px' }}
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <select style={{ padding: '8px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}>
          <option>Auto-detect type</option>
          <option>Episodic</option>
          <option>Semantic</option>
        </select>
        <input 
          type="text" 
          placeholder="Source label (optional)"
          style={{ padding: '8px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      <button style={{ width: '100%', backgroundColor: '#11120D', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
        Save to memory
      </button>
    </div>
  );
}
