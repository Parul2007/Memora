'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, List as ListIcon, Calendar, Filter, AlertCircle, Pin } from 'lucide-react';
import MemoryGrid from './MemoryGrid';
import MemoryList from './MemoryList';
import MemoryTimeline from './MemoryTimeline';

export default function MemoryMainArea() {
  return (
    <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <MemoryMainAreaContent />
    </Suspense>
  );
}

function MemoryMainAreaContent() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'all'; // timeline, pinned, recent, fading, all
  const currentType = searchParams.get('type') || null;

  // Local state for the layout mode (Grid, List, Timeline override)
  // Default to Timeline if view=timeline, otherwise Grid
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list' | 'timeline'>(currentView === 'timeline' ? 'timeline' : 'grid');

  const getHeaderTitle = () => {
    if (currentType) return `Type: ${currentType.charAt(0).toUpperCase() + currentType.slice(1)}`;
    switch (currentView) {
      case 'pinned': return 'Pinned Memories';
      case 'fading': return 'Fading Memories';
      case 'timeline': return 'Memory Timeline';
      case 'recent': return 'Recent Memories';
      default: return 'All Memories';
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentView) {
      case 'pinned': return 'Pinned memories are protected and never decay over time.';
      case 'fading': return 'These memories have a high decay factor and need reinforcement to prevent them from fading entirely.';
      default: return null;
    }
  };

  const modeBtnStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px', background: active ? 'white' : 'transparent',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    color: active ? '#11120D' : '#A0988A', fontWeight: active ? 600 : 500,
    fontSize: '13px', boxShadow: active ? '0 2px 4px rgba(0,0,0,0.02)' : 'none'
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Dynamic Header State */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #e7e5e4', backgroundColor: 'white' }}>
        <h1 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', color: '#11120D', margin: '0 0 4px 0' }}>
          {getHeaderTitle()}
        </h1>
        {getHeaderSubtitle() && (
          <p style={{ fontSize: '13px', color: '#565449', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {currentView === 'fading' && <AlertCircle size={14} color="#be185d" />}
            {currentView === 'pinned' && <Pin size={14} color="#d97706" />}
            {getHeaderSubtitle()}
          </p>
        )}
      </div>

      {/* Control Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px', backgroundColor: '#FAFAF9', borderBottom: '1px solid #e7e5e4' }}>
        
        {/* Layout Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#e7e5e4', padding: '4px', borderRadius: '8px' }}>
          <button onClick={() => setLayoutMode('grid')} style={modeBtnStyle(layoutMode === 'grid')}>
            <LayoutGrid size={14} /> Grid
          </button>
          <button onClick={() => setLayoutMode('list')} style={modeBtnStyle(layoutMode === 'list')}>
            <ListIcon size={14} /> List
          </button>
          <button onClick={() => setLayoutMode('timeline')} style={modeBtnStyle(layoutMode === 'timeline')}>
            <Calendar size={14} /> Timeline
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <select style={selectStyle}>
            <option>Sort: Newest</option>
            <option>Sort: Oldest</option>
            <option>Sort: Highest Importance</option>
          </select>
          <select style={selectStyle}>
            <option>Date: Last 30 days</option>
            <option>Date: This Year</option>
            <option>Date: All time</option>
          </select>
          <select style={selectStyle}>
            <option>Health: All</option>
            <option>Health: Strong</option>
            <option>Health: Weak</option>
          </select>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#A0988A', fontSize: '13px', cursor: 'pointer' }}>
            <Filter size={14} /> Clear filters
          </button>
        </div>
      </div>

      {/* Render Active View */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#FAFAF9' }}>
        {layoutMode === 'grid' && <MemoryGrid filterView={currentView} filterType={currentType} />}
        {layoutMode === 'list' && <MemoryList filterView={currentView} filterType={currentType} />}
        {layoutMode === 'timeline' && <MemoryTimeline filterView={currentView} filterType={currentType} />}
      </div>

    </div>
  );
}

const selectStyle = {
  background: 'white', border: '1px solid #e7e5e4', borderRadius: '6px', 
  padding: '6px 12px', fontSize: '13px', color: '#11120D', outline: 'none', cursor: 'pointer'
};
