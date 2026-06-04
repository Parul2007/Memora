'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Pin, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { MemoryData, getHealth } from '../../services/mockMemories';
import { fetchMemories, deleteMemory, updateMemory } from '../../services/memoryService';

const TYPE_COLORS = {
  episodic: { bg: '#e0f2fe', text: '#0284c7' },
  semantic: { bg: '#fef08a', text: '#a16207' },
  procedural: { bg: '#dcfce7', text: '#15803d' },
  emotional: { bg: '#fce7f3', text: '#be185d' }
};

export default function MemoryGrid({ filterView, filterType }: { filterView: string, filterType: string | null }) {
  const [memories, setMemories] = useState<MemoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMemories()
      .then((data) => {
        if (!cancelled) setMemories(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load memories.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      alert(msg);
    }
  }, []);

  const handlePin = useCallback(async (id: string, currentPinned: boolean) => {
    try {
      const updated = await updateMemory(id, { metadata: { pinned: !currentPinned } });
      setMemories((prev) => prev.map(m => m.id === id ? { ...m, pinned: updated.pinned } : m));
    } catch (err: unknown) {
      alert('Failed to pin memory.');
    }
  }, []);

  const handleEdit = useCallback(async (id: string, currentContent: string) => {
    const newContent = prompt('Edit memory content:', currentContent);
    if (newContent && newContent !== currentContent) {
      try {
        const updated = await updateMemory(id, { content: newContent });
        setMemories((prev) => prev.map(m => m.id === id ? { ...m, content: updated.content } : m));
      } catch (err: unknown) {
        alert('Failed to update memory.');
      }
    }
  }, []);

  // Filter logic based on current route parameters
  let filteredMemories = memories;
  if (filterType) {
    filteredMemories = filteredMemories.filter(m => m.type === filterType);
  }
  if (filterView === 'pinned') {
    filteredMemories = filteredMemories.filter(m => m.pinned);
  } else if (filterView === 'fading') {
    filteredMemories = filteredMemories.filter(m => m.decayFactor >= 0.7);
  }

  if (loading) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: '#A0988A', fontSize: '14px' }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', color: '#be185d', fontSize: '14px' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
      {filteredMemories.length === 0 ? (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px', color: '#A0988A' }}>
          No memories found for this view.
        </div>
      ) : (
        filteredMemories.map(mem => (
          <MemoryCard 
            key={mem.id} 
            memory={mem} 
            onDelete={handleDelete} 
            onPin={handlePin}
            onEdit={handleEdit}
          />
        ))
      )}
    </div>
  );
}

function MemoryCard({ 
  memory, 
  onDelete,
  onPin,
  onEdit
}: { 
  memory: MemoryData; 
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onEdit: (id: string, content: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const health = getHealth(memory.decayFactor);

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '16px',
        padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
        boxShadow: isHovered ? '0 10px 25px rgba(0,0,0,0.05)' : '0 2px 8px rgba(0,0,0,0.02)',
        transition: 'all 0.2s', position: 'relative'
      }}
    >
      {/* Top Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ backgroundColor: TYPE_COLORS[memory.type].bg, color: TYPE_COLORS[memory.type].text, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px' }}>
            {memory.type}
          </span>
          <span style={{ fontSize: '11px', color: '#A0988A', fontWeight: 600 }}>{memory.source}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {memory.pinned && <Pin size={12} fill="#d97706" color="#d97706" />}
          <span style={{ fontSize: '11px', color: '#A0988A' }}>{memory.timestamp}</span>
        </div>
      </div>

      {/* Content */}
      <Link href={`/memory/${memory.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <p style={{ fontSize: '14px', color: '#11120D', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          "{memory.content}"
        </p>
      </Link>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {memory.tags.map(tag => (
          <span key={tag} style={{ backgroundColor: '#f5f5f4', color: '#565449', fontSize: '10px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px' }}>
            #{tag}
          </span>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Data Strip */}
      <div style={{ backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#565449', letterSpacing: '0.05em' }}>IMPORTANCE</span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#11120D' }}>{memory.importance.toFixed(2)}</span>
        </div>
        <div style={{ width: '100%', height: '4px', backgroundColor: '#e7e5e4', borderRadius: '2px' }}>
          <div style={{ width: `${memory.importance * 100}%`, height: '100%', backgroundColor: '#11120D', borderRadius: '2px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: health.color }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#565449' }}>{health.label}</span>
          </div>
          <span style={{ fontSize: '11px', color: '#A0988A' }}>Accessed {memory.accessed}×</span>
        </div>
      </div>

      {/* Hover Action Footer */}
      {isHovered && (
        <div style={{ position: 'absolute', bottom: '-40px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ 
            backgroundColor: '#11120D', borderRadius: '9999px', padding: '6px 12px', 
            display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <button title="Edit" style={actionBtnStyle} onClick={() => onEdit(memory.id, memory.content)}><Edit2 size={14} /></button>
            <button title="Pin" style={actionBtnStyle} onClick={() => onPin(memory.id, memory.pinned)}><Pin size={14} fill={memory.pinned ? "#FFFBF4" : "none"} /></button>
            <Link href={`/memory/${memory.id}`} title="View detail" style={actionBtnStyle}><ExternalLink size={14} /></Link>
            <button title="Delete" style={{...actionBtnStyle, color: '#ef4444'}} onClick={() => onDelete(memory.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = { background: 'none', border: 'none', color: '#FFFBF4', cursor: 'pointer', display: 'flex' };
