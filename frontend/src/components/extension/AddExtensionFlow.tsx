'use client';
import React from 'react';
import { Bot, MessageSquare, ExternalLink } from 'lucide-react';

export default function AddExtensionFlow() {
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '32px', marginTop: '32px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#11120D', margin: '0 0 8px 0' }}>Add Memora to your Platforms</h2>
      <p style={{ fontSize: '14px', color: '#78716c', margin: '0 0 24px 0', lineHeight: 1.5 }}>
        Click a platform below to test the extension integration. It will open a simulated tab to show exactly how the Memora floating widget appears on those sites!
      </p>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <a 
          href="/mockup/chatgpt" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', 
            backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '10px',
            textDecoration: 'none', color: '#11120D', flex: '1', minWidth: '200px',
            transition: 'all 0.2s', cursor: 'pointer'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#0284c7'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e7e5e4'}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} color="#0284c7" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Test on ChatGPT</div>
            <div style={{ fontSize: '12px', color: '#78716c' }}>Opens Mockup</div>
          </div>
          <ExternalLink size={16} color="#A0988A" />
        </a>

        <a 
          href="/mockup/claude" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', 
            backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '10px',
            textDecoration: 'none', color: '#11120D', flex: '1', minWidth: '200px',
            transition: 'all 0.2s', cursor: 'pointer'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#166534'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e7e5e4'}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} color="#166534" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Test on Claude</div>
            <div style={{ fontSize: '12px', color: '#78716c' }}>Opens Mockup</div>
          </div>
          <ExternalLink size={16} color="#A0988A" />
        </a>
      </div>
    </div>
  );
}
