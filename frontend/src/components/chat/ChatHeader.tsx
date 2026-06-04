import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Download, Archive, Trash2, StopCircle } from 'lucide-react';

export default function ChatHeader({ 
  sessionTitle, 
  onRename, 
  onEndSession,
  onExport,
  onDelete
}: { 
  sessionTitle: string, 
  onRename: (newTitle: string) => void,
  onEndSession: () => void,
  onExport?: () => void,
  onDelete?: () => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(sessionTitle);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditVal(sessionTitle);
  }, [sessionTitle]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    setIsEditing(false);
    if (editVal.trim() && editVal !== sessionTitle) onRename(editVal.trim());
    else setEditVal(sessionTitle);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e7e5e4', backgroundColor: 'white' }}>
      
      {/* Title */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        {isEditing ? (
          <input 
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if(e.key === 'Enter') handleSave(); if(e.key === 'Escape') { setIsEditing(false); setEditVal(sessionTitle); } }}
            autoFocus
            style={{ fontSize: '16px', fontWeight: 600, color: '#11120D', border: '1px solid #D8CFBC', borderRadius: '6px', padding: '4px 8px', outline: 'none', width: '300px' }}
          />
        ) : (
          <h1 
            onClick={() => setIsEditing(true)}
            style={{ fontSize: '16px', fontWeight: 600, color: '#11120D', margin: 0, cursor: 'pointer', padding: '5px 9px', borderRadius: '6px' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f4'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {sessionTitle}
          </h1>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={onEndSession}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', 
            backgroundColor: '#FFFBF4', color: '#11120D', border: '1px solid #A0988A', 
            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <StopCircle size={14} color="#be185d" /> End Session
        </button>

        <div style={{ position: 'relative' }} ref={menuRef}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f4'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <MoreHorizontal size={18} color="#565449" />
          </button>

          {menuOpen && (
            <div style={{ 
              position: 'absolute', right: 0, top: '100%', marginTop: '8px', zIndex: 50,
              backgroundColor: 'white', borderRadius: '12px', padding: '8px', width: '220px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #e7e5e4'
            }}>
              <button style={menuItemStyle} onClick={() => { onExport?.(); setMenuOpen(false); }}><Download size={14} /> Export session</button>
              <button style={menuItemStyle} onClick={() => setMenuOpen(false)}><Archive size={14} /> View all memories from session</button>
              <div style={{ height: '1px', backgroundColor: '#e7e5e4', margin: '4px 0' }} />
              <button style={{ ...menuItemStyle, color: '#ef4444' }} onClick={() => { onDelete?.(); setMenuOpen(false); }}><Trash2 size={14} color="#ef4444"/> Delete session</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
  background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer',
  fontSize: '13px', fontWeight: 500, color: '#11120D', textAlign: 'left' as const
};
