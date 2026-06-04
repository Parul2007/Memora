'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, BrainCircuit, Calendar, Pin, Clock, AlertTriangle, MessageSquare, Plus, Zap, Heart } from 'lucide-react';
import ManualCaptureWidget from '../extension/ManualCaptureWidget';

export default function MemorySidebar() {
  return (
    <Suspense fallback={<div style={{ width: '280px', backgroundColor: '#FAFAF9' }} />}>
      <SidebarContent />
    </Suspense>
  );
}

function SidebarContent() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'all';
  const currentType = searchParams.get('type') || '';
  const currentSource = searchParams.get('source') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  const [customSources, setCustomSources] = useState<string[]>([]);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceValue, setNewSourceValue] = useState('');

  const handleAddSource = () => {
    if (newSourceValue.trim() && !customSources.includes(newSourceValue.trim())) {
      setCustomSources([...customSources, newSourceValue.trim()]);
    }
    setNewSourceValue('');
    setIsAddingSource(false);
  };

  const isActive = (paramName: string, paramValue: string) => {
    if (paramName === 'view' && !searchParams.has('type') && !searchParams.has('source')) {
      return currentView === paramValue;
    }
    return searchParams.get(paramName) === paramValue;
  };

  const navItemStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
    backgroundColor: active ? '#e7e5e4' : 'transparent',
    color: active ? '#11120D' : '#565449',
    fontWeight: active ? 600 : 500,
    fontSize: '13px', textDecoration: 'none', transition: 'all 0.1s'
  });

  return (
    <aside style={{ 
      width: '280px', display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: '#FAFAF9', padding: '16px 0', boxSizing: 'border-box'
    }}>
      
      {/* Search Action */}
      <div style={{ padding: '0 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
        {isSearchExpanded ? (
          <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
            <Search size={16} color="#A0988A" style={{ position: 'absolute', left: '12px' }} />
            <input 
              autoFocus
              type="text" 
              placeholder="Search memories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && searchQuery) {
                  // In a real app we'd trigger a router.push(`?search=${searchQuery}`)
                  alert("Search functionality coming up!");
                }
              }}
              style={{ 
                width: '100%', padding: '8px 12px 8px 36px', boxSizing: 'border-box',
                backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '10px',
                fontSize: '13px', color: '#11120D', outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }} 
            />
          </div>
        ) : (
          <button 
            onClick={() => setIsSearchExpanded(true)}
            style={{ 
              width: '100%', background: 'white', border: '1px solid #e7e5e4', cursor: 'pointer', 
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px',
              borderRadius: '10px', color: '#565449', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              fontSize: '13px', fontWeight: 500
            }}
          >
            <Search size={14} color="#A0988A" /> Search memories
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* All Memories */}
        <Link href="/memory" style={navItemStyle(isActive('view', 'all'))}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BrainCircuit size={16} /> All Memories
          </div>
        </Link>

        {/* By Type */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px', textTransform: 'uppercase' }}>By Type</div>
          <Link href="/memory?type=episodic" style={navItemStyle(isActive('type', 'episodic'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={14} color="#0284c7" /> Episodic</div>
            <span style={{ fontSize: '11px', color: '#A0988A' }}>312</span>
          </Link>
          <Link href="/memory?type=semantic" style={navItemStyle(isActive('type', 'semantic'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={14} color="#a16207" /> Semantic</div>
            <span style={{ fontSize: '11px', color: '#A0988A' }}>198</span>
          </Link>
          <Link href="/memory?type=emotional" style={navItemStyle(isActive('type', 'emotional'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Heart size={14} color="#be185d" /> Emotional</div>
            <span style={{ fontSize: '11px', color: '#A0988A' }}>248</span>
          </Link>
          <Link href="/memory?type=procedural" style={navItemStyle(isActive('type', 'procedural'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={14} color="#15803d" /> Procedural</div>
            <span style={{ fontSize: '11px', color: '#A0988A' }}>89</span>
          </Link>
        </div>

        {/* Views */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px', textTransform: 'uppercase' }}>Views</div>
          <Link href="/memory?view=timeline" style={navItemStyle(isActive('view', 'timeline'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} /> Timeline</div>
          </Link>
          <Link href="/memory?view=pinned" style={navItemStyle(isActive('view', 'pinned'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Pin size={14} /> Pinned</div>
          </Link>
          <Link href="/memory?view=recent" style={navItemStyle(isActive('view', 'recent'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={14} /> Recent</div>
          </Link>
          <Link href="/memory?view=fading" style={navItemStyle(isActive('view', 'fading'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isActive('view', 'fading') ? '#be185d' : '#565449' }}>
              <AlertTriangle size={14} color={isActive('view', 'fading') ? '#be185d' : '#a8a29e'} /> Fading
            </div>
          </Link>
        </div>

        {/* By Source */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px', textTransform: 'uppercase' }}>By Source</div>
          <Link href="/memory?source=memora" style={navItemStyle(isActive('source', 'memora'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Memora Chat</div>
          </Link>
          <Link href="/memory?source=chatgpt" style={navItemStyle(isActive('source', 'chatgpt'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>ChatGPT</div>
          </Link>
          <Link href="/memory?source=claude" style={navItemStyle(isActive('source', 'claude'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Claude</div>
          </Link>
          <Link href="/memory?source=manual" style={navItemStyle(isActive('source', 'manual'))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Manual</div>
          </Link>

          {/* Custom Sources */}
          {customSources.map(src => (
            <Link key={src} href={`/memory?source=${src.toLowerCase()}`} style={navItemStyle(isActive('source', src.toLowerCase()))}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{src}</div>
            </Link>
          ))}

          {/* Add Source Input / Button */}
          {isAddingSource ? (
            <div style={{ padding: '4px 12px', marginTop: '4px' }}>
              <input 
                autoFocus
                value={newSourceValue}
                onChange={e => setNewSourceValue(e.target.value)}
                onBlur={handleAddSource}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSource(); if (e.key === 'Escape') setIsAddingSource(false); }}
                placeholder="Source name..."
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #D8CFBC',
                  fontSize: '12px', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          ) : (
            <button 
              onClick={() => setIsAddingSource(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', width: '100%',
                background: 'none', border: 'none', color: '#A0988A', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', textAlign: 'left', marginTop: '4px'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#11120D'}
              onMouseLeave={e => e.currentTarget.style.color = '#A0988A'}
            >
              <Plus size={14} /> Add source
            </button>
          )}
        </div>

      </div>

      {/* Bottom Action */}
      <div style={{ padding: '16px', borderTop: '1px solid #e7e5e4', marginTop: 'auto' }}>
        <ManualCaptureWidget />
      </div>

    </aside>
  );
}
