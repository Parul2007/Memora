'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MemoryData, getHealth } from '../../services/mockMemories';
import { fetchMemories, deleteMemory, updateMemory } from '../../services/memoryService';
import { MoreHorizontal, Trash2, Pin, Edit2 } from 'lucide-react';

export default function MemoryList({ filterView, filterType }: { filterView: string, filterType: string | null }) {
  const [memories, setMemories] = useState<MemoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      alert(msg);
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => deleteMemory(id)));
      setMemories((prev) => prev.filter((m) => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bulk delete failed.';
      alert(msg);
    }
  }, [selectedIds]);

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

  const handleBulkPin = useCallback(async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => updateMemory(id, { metadata: { pinned: true } })));
      setMemories((prev) => prev.map(m => selectedIds.has(m.id) ? { ...m, pinned: true } : m));
      setSelectedIds(new Set());
    } catch (err: unknown) {
      alert('Bulk pin failed.');
    }
  }, [selectedIds]);

  const handleExport = useCallback(() => {
    const selectedMemories = memories.filter(m => selectedIds.has(m.id));
    const blob = new Blob([JSON.stringify(selectedMemories, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memora-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedIds, memories]);

  let filteredMemories = memories;
  if (filterType) filteredMemories = filteredMemories.filter(m => m.type === filterType);
  if (filterView === 'pinned') filteredMemories = filteredMemories.filter(m => m.pinned);
  else if (filterView === 'fading') filteredMemories = filteredMemories.filter(m => m.decayFactor >= 0.7);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredMemories.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredMemories.map(m => m.id)));
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#11120D', color: '#FFFBF4', borderRadius: '12px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 50 }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedIds.size} selected</span>
          <div style={{ width: '1px', height: '16px', backgroundColor: '#565449' }} />
          <div style={{ display: 'flex', gap: '16px' }}>
            <button style={bulkBtnStyle} onClick={handleBulkDelete}>Delete</button>
            <button style={bulkBtnStyle} onClick={handleExport}>Export</button>
            <button style={bulkBtnStyle} onClick={handleBulkPin}>Pin all</button>
            <button style={bulkBtnStyle} onClick={() => setSelectedIds(new Set())}>Clear selection</button>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px 100px 1fr 100px 100px 100px 100px 60px', padding: '16px 32px', borderBottom: '1px solid #e7e5e4', fontSize: '11px', fontWeight: 700, color: '#A0988A', textTransform: 'uppercase', letterSpacing: '0.05em', alignItems: 'center' }}>
        <input type="checkbox" checked={selectedIds.size === filteredMemories.length && filteredMemories.length > 0} onChange={toggleAll} />
        <div>Type</div>
        <div>Content Preview</div>
        <div>Importance</div>
        <div>Health</div>
        <div>Source</div>
        <div>Date</div>
        <div style={{ textAlign: 'right' }}>Actions</div>
      </div>

      {/* Table Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredMemories.map((mem) => {
          const health = getHealth(mem.decayFactor);
          return (
            <div key={mem.id} style={{ display: 'grid', gridTemplateColumns: '40px 100px 1fr 100px 100px 100px 100px 60px', padding: '12px 32px', borderBottom: '1px solid #f5f5f4', fontSize: '13px', color: '#11120D', alignItems: 'center', backgroundColor: selectedIds.has(mem.id) ? '#fefce8' : 'white' }}>
              <input type="checkbox" checked={selectedIds.has(mem.id)} onChange={() => toggleSelect(mem.id)} />
              <div style={{ textTransform: 'capitalize', color: '#565449', fontWeight: 500 }}>{mem.type}</div>
              <Link href={`/memory/${mem.id}`} style={{ textDecoration: 'none', color: '#11120D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '24px' }}>
                "{mem.content}"
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '4px', backgroundColor: '#e7e5e4', borderRadius: '2px' }}>
                  <div style={{ width: `${mem.importance * 100}%`, height: '100%', backgroundColor: '#11120D', borderRadius: '2px' }} />
                </div>
                {mem.importance.toFixed(2)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: health.color }} />
                {health.label}
              </div>
              <div style={{ color: '#565449' }}>{mem.source}</div>
              <div style={{ color: '#A0988A' }}>{mem.timestamp}</div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                <button title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0988A', display: 'flex' }} onClick={() => handleEdit(mem.id, mem.content)}>
                  <Edit2 size={14} />
                </button>
                <button title="Pin" style={{ background: 'none', border: 'none', cursor: 'pointer', color: mem.pinned ? '#d97706' : '#A0988A', display: 'flex' }} onClick={() => handlePin(mem.id, mem.pinned)}>
                  <Pin size={14} fill={mem.pinned ? "#d97706" : "none"} />
                </button>
                <button
                  title="Delete"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                  onClick={() => handleDelete(mem.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const bulkBtnStyle = { background: 'none', border: 'none', color: '#D8CFBC', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };
