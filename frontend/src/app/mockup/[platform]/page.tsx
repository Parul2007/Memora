'use client';
import React, { useState } from 'react';
import { Bot, MessageSquare, Check, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function MockupPage({ params }: { params: { platform: string } }) {
  const unwrappedParams = React.use(params as any) as { platform: string };
  const [expanded, setExpanded] = useState(false);
  const [syncPast, setSyncPast] = useState(true);
  const [syncCurrent, setSyncCurrent] = useState(true);
  const [enabled, setEnabled] = useState(false);

  // Fallback to chatgpt if params.platform isn't provided or is invalid
  const platform = ['chatgpt', 'claude'].includes(unwrappedParams.platform) ? unwrappedParams.platform : 'chatgpt';
  
  const isChatGPT = platform === 'chatgpt';
  const bgColor = isChatGPT ? '#343541' : '#f5f4ef';
  const textColor = isChatGPT ? '#ececf1' : '#11120D';
  const sidebarColor = isChatGPT ? '#202123' : '#e5e3db';
  const title = isChatGPT ? 'ChatGPT' : 'Claude';

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', backgroundColor: bgColor, color: textColor, fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
      
      {/* Fake Platform Sidebar */}
      <div style={{ width: '260px', height: '100%', backgroundColor: sidebarColor, borderRight: isChatGPT ? 'none' : '1px solid #d4d4d4', padding: '16px', boxSizing: 'border-box' }}>
        <div style={{ padding: '12px', border: isChatGPT ? '1px solid #4d4d4f' : '1px solid #d4d4d4', borderRadius: '6px', marginBottom: '24px', cursor: 'pointer' }}>
          + New chat
        </div>
        <div style={{ fontSize: '12px', color: isChatGPT ? '#8e8ea0' : '#78716c', marginBottom: '8px' }}>Today</div>
        <div style={{ padding: '8px', fontSize: '14px', borderRadius: '6px', backgroundColor: isChatGPT ? '#343541' : '#d4d4d4', marginBottom: '4px' }}>Discussing React Hooks</div>
        <div style={{ padding: '8px', fontSize: '14px', borderRadius: '6px' }}>Docker configuration help</div>
      </div>

      {/* Fake Platform Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 600, marginBottom: '40px' }}>{title}</h1>
        
        <div style={{ width: '100%', maxWidth: '700px', display: 'flex', gap: '16px', marginBottom: '32px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '4px', backgroundColor: '#5436DA', flexShrink: 0 }} />
          <div style={{ flex: 1, lineHeight: 1.6, fontSize: '15px' }}>
            Can you explain how the floating rectangle UI for a Chrome extension is usually implemented?
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '700px', display: 'flex', gap: '16px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '4px', backgroundColor: isChatGPT ? '#10a37f' : '#d97757', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isChatGPT ? <Bot size={20} color="white" /> : <MessageSquare size={20} color="white" />}
          </div>
          <div style={{ flex: 1, lineHeight: 1.6, fontSize: '15px' }}>
            Typically, a Chrome extension uses a <strong>content script</strong> to inject a new DOM element (like a <code>&lt;div&gt;</code>) directly into the body of the webpage. This element is given a fixed or absolute CSS position so it "floats" above the page's original content.
          </div>
        </div>
      </div>

      {/* 
        ========================================================
        MEMORA EXTENSION INJECTED UI 
        ========================================================
      */}
      <div 
        style={{
          position: 'fixed',
          left: '0',
          top: '30%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'flex-start',
          zIndex: 9999,
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {/* The Sleek Rectangle Tab */}
        <div 
          onClick={() => setExpanded(!expanded)}
          style={{
            backgroundColor: '#11120D',
            color: 'white',
            padding: '12px 8px',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '4px 0px 12px rgba(0,0,0,0.15)',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#292524'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#11120D'}
        >
          {enabled ? (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          ) : (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#78716c' }} />
          )}
          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>
            MEMORA
          </span>
        </div>

        {/* The Popover Menu */}
        {expanded && (
          <div style={{
            backgroundColor: 'white',
            marginLeft: '8px',
            borderRadius: '12px',
            padding: '24px',
            width: '280px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            border: '1px solid #e7e5e4',
            color: '#11120D'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🧠</span>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Memora Sync</h3>
              </div>
              <X size={18} color="#A0988A" style={{ cursor: 'pointer' }} onClick={() => setExpanded(false)} />
            </div>

            <p style={{ fontSize: '13px', color: '#78716c', marginBottom: '20px', lineHeight: 1.5 }}>
              Enable Memora on {title} to automatically capture and structure your AI memories.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={syncPast} 
                  onChange={e => setSyncPast(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#11120D', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Sync past memories</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={syncCurrent} 
                  onChange={e => setSyncCurrent(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#11120D', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Sync current conversation</span>
              </label>
            </div>

            <button 
              onClick={() => {
                setEnabled(true);
                setTimeout(() => setExpanded(false), 800);
              }}
              style={{ 
                width: '100%', 
                backgroundColor: enabled ? '#22c55e' : '#11120D', 
                color: 'white', 
                border: 'none', 
                padding: '12px', 
                borderRadius: '8px', 
                fontSize: '14px', 
                fontWeight: 600, 
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {enabled ? (
                <>
                  <Check size={18} /> Extension Enabled
                </>
              ) : (
                'Enable Extension'
              )}
            </button>
            
            {enabled && (
              <div style={{ textAlign: 'center', fontSize: '11px', color: '#16a34a', marginTop: '12px', fontWeight: 500 }}>
                Memora is now actively listening to this tab.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
