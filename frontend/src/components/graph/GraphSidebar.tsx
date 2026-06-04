'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Map, Table as TableIcon } from 'lucide-react';

export const GRAPH_COLORS = {
  person: '#0284c7',   // blue
  place: '#a16207',    // yellow/amber
  org: '#be185d',      // pink/rose
  concept: '#15803d',  // green
  goal: '#6d28d9',     // purple
  event: '#b45309',    // orange
  habit: '#0f766e'     // teal
};

export default function GraphSidebar() {
  return (
    <Suspense fallback={<div style={{ width: '280px', backgroundColor: '#FAFAF9' }} />}>
      <SidebarContent />
    </Suspense>
  );
}

function SidebarContent() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'graph';

  const [searchQuery, setSearchQuery] = useState('');
  const [minMentions, setMinMentions] = useState(3);
  
  // Toggles state could technically be lifted to context or URL params, 
  // but for the visual mock we'll keep it local to demonstrate the UI.
  const [activeTypes, setActiveTypes] = useState<Record<string, boolean>>({
    person: true, place: true, org: true, concept: true, goal: true, event: true, habit: true
  });

  const toggleType = (type: string) => {
    setActiveTypes(prev => ({ ...prev, [type]: !prev[type] }));
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
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
          <Search size={16} color="#A0988A" style={{ position: 'absolute', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Find entity..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', padding: '10px 12px 10px 36px', boxSizing: 'border-box',
              backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px',
              fontSize: '13px', color: '#11120D', outline: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }} 
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Entity Types */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px', textTransform: 'uppercase' }}>Entity Types</div>
          
          {Object.entries(GRAPH_COLORS).map(([type, color]) => (
            <div 
              key={type} 
              onClick={() => toggleType(type)}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', cursor: 'pointer', opacity: activeTypes[type] ? 1 : 0.5
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                <span style={{ fontSize: '13px', color: '#11120D', textTransform: 'capitalize', fontWeight: 500 }}>{type}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#A0988A' }}>
                {/* Mock counts */}
                {type === 'concept' ? 91 : type === 'person' ? 47 : 19}
              </span>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '12px', textTransform: 'uppercase' }}>Filter</div>
          
          <div style={{ padding: '0 12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#565449', fontWeight: 500 }}>Min. mentions:</span>
              <span style={{ fontSize: '12px', color: '#11120D', fontWeight: 700 }}>{minMentions}</span>
            </div>
            <input 
              type="range" 
              min="1" max="20" 
              value={minMentions} 
              onChange={(e) => setMinMentions(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#11120D' }} 
            />
          </div>

          <div style={{ padding: '0 12px' }}>
            <div style={{ fontSize: '12px', color: '#565449', fontWeight: 500, marginBottom: '8px' }}>Time range:</div>
            <select style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '12px', color: '#11120D', outline: 'none' }}>
              <option>Last 90 days</option>
              <option>This Year</option>
              <option>All Time</option>
            </select>
          </div>
        </div>

        {/* Top Entities */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px', textTransform: 'uppercase' }}>Top Entities</div>
          
          <div style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#11120D' }}><strong>1.</strong> Alex <span style={{ color: '#A0988A', fontSize: '11px' }}>(person)</span></div>
            <div style={{ fontSize: '12px', color: '#11120D' }}><strong>2.</strong> Berlin <span style={{ color: '#A0988A', fontSize: '11px' }}>(place)</span></div>
            <div style={{ fontSize: '12px', color: '#11120D' }}><strong>3.</strong> Startup <span style={{ color: '#A0988A', fontSize: '11px' }}>(org)</span></div>
            <div style={{ fontSize: '12px', color: '#11120D' }}><strong>4.</strong> Anxiety <span style={{ color: '#A0988A', fontSize: '11px' }}>(concept)</span></div>
            <div style={{ fontSize: '12px', color: '#11120D' }}><strong>5.</strong> Fitness <span style={{ color: '#A0988A', fontSize: '11px' }}>(habit)</span></div>
            <button style={{ background: 'none', border: 'none', color: '#A0988A', fontSize: '11px', textAlign: 'left', padding: 0, marginTop: '4px', cursor: 'pointer' }}>Show all ▾</button>
          </div>
        </div>

        {/* Views */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px', textTransform: 'uppercase' }}>Views</div>
          <Link href="/graph?view=graph" style={navItemStyle(currentView === 'graph')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Map size={14} /> Graph (default)</div>
          </Link>
          <Link href="/graph?view=table" style={navItemStyle(currentView === 'table')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TableIcon size={14} /> Table view</div>
          </Link>
        </div>

      </div>
    </aside>
  );
}
