import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, MessageSquare, Star, Search, MoreHorizontal, ChevronDown, ChevronRight, Download, Trash2, Edit2, Pin, Archive, ArchiveRestore } from 'lucide-react';
import { Session } from '../../types';
import { apiFetch } from '../../services/apiClient';

// ─── helpers ────────────────────────────────────────────────────────────────

function getGroup(startedAt: string): Session['group'] {
  const now = new Date();
  const d = new Date(startedAt);
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'This week';
  return 'Older';
}

function formatTime(startedAt: string): string {
  const d = new Date(startedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays <= 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── component ──────────────────────────────────────────────────────────────

export default function ChatSidebar() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [olderCollapsed, setOlderCollapsed] = useState(true);
  const [archivedCollapsed, setArchivedCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ id: string, text: string, type: 'info' | 'error' | 'success', undo?: () => void } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── fetch sessions from API ──────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiFetch<{ sessions: Array<{
        id: string;
        title: string;
        started_at: string;
        message_count: number;
        is_consolidated: boolean;
        is_starred: boolean;
        is_archived: boolean;
      }> }>('/api/sessions/');

      const mapped: Session[] = (data.sessions || []).map(s => ({
        id: s.id,
        title: s.title || 'New Conversation',
        time: formatTime(s.started_at),
        group: getGroup(s.started_at),
        memories: s.message_count || 0,
        starred: s.is_starred || false,
        is_archived: s.is_archived || false,
        started_at: s.started_at,
      }));
      setSessions(mapped);
    } catch {
      // silently ignore auth errors on mount when not yet logged in
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Refresh sessions when a new chat is started or a message is sent
  useEffect(() => {
    const handleNewChat = () => {
      setActiveId(null);
    };
    const handleSessionCreated = (e: Event) => {
      const { sessionId } = (e as CustomEvent).detail;
      setActiveId(sessionId);
      
      const newSession: Session = {
        id: sessionId,
        title: "New Conversation",
        time: "Just now",
        group: 'Today',
        memories: 0,
        starred: false,
        is_archived: false,
        started_at: new Date().toISOString(),
        loadingTitle: true
      };
      
      setSessions(prev => {
        if (prev.some(s => s.id === sessionId)) return prev;
        return [newSession, ...prev];
      });

      // Poll for session after a delay (title generation may take a bit)
      setTimeout(fetchSessions, 1500);
      setTimeout(fetchSessions, 4000);
      setTimeout(fetchSessions, 8000);
    };
    const handleSessionUpdated = () => {
      fetchSessions();
    };

    window.addEventListener('new-chat', handleNewChat);
    window.addEventListener('session-created', handleSessionCreated);
    window.addEventListener('session-updated', handleSessionUpdated);
    return () => {
      window.removeEventListener('new-chat', handleNewChat);
      window.removeEventListener('session-created', handleSessionCreated);
      window.removeEventListener('session-updated', handleSessionUpdated);
    };
  }, [fetchSessions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => searchInputRef.current?.focus(), 10);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('new-chat'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Derived state
  const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const activeSessions = filteredSessions.filter(s => !s.is_archived);
  const archivedSessions = filteredSessions.filter(s => s.is_archived);

  const starredSessions = activeSessions.filter(s => s.starred);
  const unstarredSessions = activeSessions.filter(s => !s.starred);

  const todaySessions = unstarredSessions.filter(s => s.group === 'Today');
  const yesterdaySessions = unstarredSessions.filter(s => s.group === 'Yesterday');
  const weekSessions = unstarredSessions.filter(s => s.group === 'This week');
  const olderSessions = unstarredSessions.filter(s => s.group === 'Older');

  const showToast = (text: string, type: 'info' | 'error' | 'success' = 'info', undo?: () => void) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToastMessage({ id, text, type, undo });
    setTimeout(() => {
      setToastMessage(prev => prev?.id === id ? null : prev);
    }, 5000);
  };

  const handleUpdateSession = async (id: string, updates: Partial<Session>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    try {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.starred !== undefined) payload.is_starred = updates.starred;
      if (updates.is_archived !== undefined) payload.is_archived = updates.is_archived;
      
      await apiFetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (updates.is_archived) {
        showToast("Session archived", "success");
      }
      if (updates.is_archived === false) {
        showToast("Session unarchived", "success");
      }
    } catch {
      showToast("Failed to update session", "error");
    }
  };

  const handleDeleteSession = async (id: string) => {
    const sessionToDelete = sessions.find(s => s.id === id);
    if (!sessionToDelete) return;
    
    // Optimistic UI deletion
    setSessions(prev => prev.filter(s => s.id !== id));
    
    // We can implement an undo by setting a timeout before actual deletion, 
    // but for simplicity we'll just soft delete if possible, or just delete directly.
    try {
      await apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
      showToast(`Deleted "${sessionToDelete.title}"`, 'success');
      if (activeId === id) {
        window.dispatchEvent(new CustomEvent('new-chat'));
      }
    } catch {
      showToast("Failed to delete session", "error");
      // Revert optimistic deletion
      setSessions(prev => [...prev, sessionToDelete]);
    }
  };

  const handleExportSession = async (id: string, title: string) => {
    try {
      const data = await apiFetch(`/api/sessions/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Exported session successfully", "success");
    } catch (e) {
      showToast("Failed to export session", "error");
    }
  };

  const handleBulkExport = async () => {
    try {
      showToast("Preparing bulk export...", "info");
      const data = await apiFetch(`/api/sessions/export/all`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memora_all_sessions_export.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Bulk export completed", "success");
    } catch (e) {
      showToast("Failed to export all sessions", "error");
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveId(id);
    window.dispatchEvent(new CustomEvent('load-session', { detail: { sessionId: id } }));
  };

  return (
    <aside className="responsive-sidebar" style={{ 
      backgroundColor: '#FAFAF9',
      padding: '16px 0',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Top Action */}
      <div style={{ padding: '0 16px', marginBottom: '12px' }}>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('new-chat'))}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            backgroundColor: '#1c1917', color: 'white', border: 'none', borderRadius: '12px',
            padding: '12px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
          title="New Chat (Cmd/Ctrl + N)"
        >
          <Plus size={16} /> New Chat
        </button>
      </div>

      {/* Search Action */}
      <div style={{ padding: '0 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
        {isSearchExpanded ? (
          <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
            <Search size={16} color="#a8a29e" style={{ position: 'absolute', left: '12px' }} />
            <input 
              ref={searchInputRef}
              autoFocus
              type="text" 
              placeholder="Search sessions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }}
              style={{ 
                width: '100%', padding: '8px 12px 8px 36px', boxSizing: 'border-box',
                backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '10px',
                fontSize: '13px', color: '#1c1917', outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }} 
            />
          </div>
        ) : (
          <button 
            onClick={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 10); }}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', color: '#a8a29e', margin: '0 -6px'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f5f5f4'; e.currentTarget.style.color = '#57534e'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#a8a29e'; }}
            title="Search sessions (Cmd/Ctrl + K)"
          >
            <Search size={16} />
          </button>
        )}
      </div>

      {/* Scrollable Sessions List */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', padding: '0 8px', marginBottom: '12px', textTransform: 'uppercase' }}>
          Sessions
        </div>

        {sessions.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#a8a29e' }}>
            <MessageSquare size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#57534e', marginBottom: '4px' }}>First Chat !</div>
            <div style={{ fontSize: '12px' }}>Start a new conversation to see it here.</div>
          </div>
        ) : activeSessions.length === 0 && searchQuery ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#a8a29e', fontSize: '13px' }}>
            No sessions match your search.
          </div>
        ) : (
          <>
            {todaySessions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#78716c', padding: '0 8px', marginBottom: '4px' }}>Today</div>
                {todaySessions.map(s => (
                  <SessionItem key={s.id} session={s} isActive={activeId === s.id} onSelect={() => handleSelectSession(s.id)} onUpdate={handleUpdateSession} onDelete={handleDeleteSession} onExport={() => handleExportSession(s.id, s.title)} />
                ))}
              </div>
            )}

            {yesterdaySessions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#78716c', padding: '0 8px', marginBottom: '4px' }}>Yesterday</div>
                {yesterdaySessions.map(s => (
                  <SessionItem key={s.id} session={s} isActive={activeId === s.id} onSelect={() => handleSelectSession(s.id)} onUpdate={handleUpdateSession} onDelete={handleDeleteSession} onExport={() => handleExportSession(s.id, s.title)} />
                ))}
              </div>
            )}

            {weekSessions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#78716c', padding: '0 8px', marginBottom: '4px' }}>This week</div>
                {weekSessions.map(s => (
                  <SessionItem key={s.id} session={s} isActive={activeId === s.id} onSelect={() => handleSelectSession(s.id)} onUpdate={handleUpdateSession} onDelete={handleDeleteSession} onExport={() => handleExportSession(s.id, s.title)} />
                ))}
              </div>
            )}

            {olderSessions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <button 
                  onClick={() => setOlderCollapsed(!olderCollapsed)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, color: '#78716c', padding: '4px 8px', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                >
                  Older {olderCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                {!olderCollapsed && olderSessions.map(s => (
                  <SessionItem key={s.id} session={s} isActive={activeId === s.id} onSelect={() => handleSelectSession(s.id)} onUpdate={handleUpdateSession} onDelete={handleDeleteSession} onExport={() => handleExportSession(s.id, s.title)} />
                ))}
              </div>
            )}
          </>
        )}

        {starredSessions.length > 0 && (
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e7e5e4' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#78716c', padding: '0 8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Pin size={12} fill="currentColor" /> Starred
            </div>
            {starredSessions.map(s => (
              <SessionItem key={s.id} session={s} isActive={activeId === s.id} onSelect={() => handleSelectSession(s.id)} onUpdate={handleUpdateSession} onDelete={handleDeleteSession} onExport={() => handleExportSession(s.id, s.title)} />
            ))}
          </div>
        )}

        {archivedSessions.length > 0 && (
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e7e5e4', paddingBottom: '16px' }}>
            <button 
              onClick={() => setArchivedCollapsed(!archivedCollapsed)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, color: '#78716c', padding: '4px 8px', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              Archived {archivedCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
            {!archivedCollapsed && archivedSessions.map(s => (
              <SessionItem key={s.id} session={s} isActive={activeId === s.id} onSelect={() => handleSelectSession(s.id)} onUpdate={handleUpdateSession} onDelete={handleDeleteSession} onExport={() => handleExportSession(s.id, s.title)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer / Bulk Export */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e7e5e4', marginTop: 'auto' }}>
        <button 
          onClick={handleBulkExport}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            background: 'none', border: 'none', color: '#78716c', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', padding: '8px', borderRadius: '8px'
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f5f5f4'; e.currentTarget.style.color = '#57534e'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#78716c'; }}
        >
          <Download size={14} /> Export All Data
        </button>
      </div>

      {/* Simple Toast Overlay */}
      {toastMessage && (
        <div style={{
          position: 'absolute', bottom: '60px', left: '16px', right: '16px', zIndex: 100,
          backgroundColor: toastMessage.type === 'error' ? '#fef2f2' : toastMessage.type === 'success' ? '#f0fdf4' : '#1c1917',
          color: toastMessage.type === 'error' ? '#991b1b' : toastMessage.type === 'success' ? '#166534' : 'white',
          border: `1px solid ${toastMessage.type === 'error' ? '#fca5a5' : toastMessage.type === 'success' ? '#86efac' : '#1c1917'}`,
          padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', animation: 'fade-in-up 0.2s ease-out'
        }}>
          {toastMessage.text}
          {toastMessage.undo && (
            <button onClick={() => { toastMessage.undo!(); setToastMessage(null); }} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Undo</button>
          )}
        </div>
      )}
      <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </aside>
  );
}

// -------------------------------------
// Individual Session Item Component
// -------------------------------------

function SessionItem({ session, isActive, onSelect, onUpdate, onDelete, onExport }: { session: Session, isActive: boolean, onSelect: () => void, onUpdate: (id: string, updates: Partial<Session>) => void, onDelete: (id: string) => void, onExport: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync title if updated from outside (e.g. auto-title)
  // MUST be before any early returns to follow Rules of Hooks
  useEffect(() => {
    setEditTitle(session.title);
  }, [session.title]);

  if (session.loadingTitle) {
    return (
      <div 
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', margin: '2px 0',
          backgroundColor: isActive ? 'white' : 'transparent',
          borderRadius: '10px',
          border: isActive ? '1px solid rgba(0,0,0,0.04)' : '1px solid transparent',
          boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <MessageSquare size={14} color="#a8a29e" style={{ flexShrink: 0 }} />
          <div style={{
            flex: 1, height: '14px', borderRadius: '4px',
            background: 'linear-gradient(90deg, #f5f5f4 25%, #e7e5e4 50%, #f5f5f4 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear'
          }} />
        </div>
      </div>
    );
  }

  const handleSaveTitle = () => {
    setIsEditing(false);
    if (editTitle.trim() && editTitle !== session.title) {
      onUpdate(session.id, { title: editTitle.trim() });
    } else {
      setEditTitle(session.title);
    }
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', margin: '2px 0',
        backgroundColor: isActive ? 'white' : isHovered ? 'rgba(0,0,0,0.03)' : 'transparent',
        borderRadius: '10px',
        cursor: 'pointer',
        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
        border: isActive ? '1px solid rgba(0,0,0,0.04)' : '1px solid transparent',
        transition: 'all 0.1s ease-in-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }} onClick={onSelect} onDoubleClick={() => setIsEditing(true)}>
        <MessageSquare size={14} color={isActive ? "#1c1917" : "#a8a29e"} style={{ flexShrink: 0 }} />
        
        {isEditing ? (
          <input 
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') { setIsEditing(false); setEditTitle(session.title); } }}
            style={{ 
              flex: 1, fontSize: '13px', fontWeight: isActive ? 600 : 500, color: '#1c1917', 
              border: '1px solid #e7e5e4', borderRadius: '4px', padding: '2px 4px', outline: 'none', margin: '-3px -5px'
            }}
          />
        ) : (
          <span style={{ 
            fontSize: '13px', fontWeight: isActive ? 600 : 500, color: isActive ? '#1c1917' : '#57534e', 
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 
          }}>
            {session.title}
          </span>
        )}
      </div>

      {!isEditing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Message count pill */}
          {session.memories > 0 && (!isHovered || isActive) && !menuOpen && (
            <div style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600 }} title={`${session.memories} memories`}>
              {session.memories}
            </div>
          )}

          {/* Timestamp or Actions */}
          {(isHovered || menuOpen) ? (
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button 
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', backgroundColor: menuOpen ? '#f5f5f4' : 'transparent' }}
              >
                <MoreHorizontal size={14} color="#78716c" />
              </button>
              
              {menuOpen && (
                <div style={{ 
                  position: 'absolute', right: 0, top: '100%', marginTop: '4px', zIndex: 50,
                  backgroundColor: 'white', borderRadius: '12px', padding: '6px', width: '160px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e7e5e4'
                }}>
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setMenuOpen(false); }} style={menuButtonStyle}><Edit2 size={14} /> Rename</button>
                  <button onClick={(e) => { e.stopPropagation(); onUpdate(session.id, { starred: !session.starred }); setMenuOpen(false); }} style={menuButtonStyle}>
                    <Star size={14} fill={session.starred ? "currentColor" : "none"} color={session.starred ? "#d97706" : "currentColor"} /> 
                    {session.starred ? 'Unstar' : 'Star'}
                  </button>
                  
                  <button onClick={(e) => { e.stopPropagation(); onUpdate(session.id, { is_archived: !session.is_archived }); setMenuOpen(false); }} style={menuButtonStyle}>
                    {session.is_archived ? <><ArchiveRestore size={14} /> Unarchive</> : <><Archive size={14} /> Archive</>}
                  </button>

                  <button onClick={(e) => { e.stopPropagation(); onExport(); setMenuOpen(false); }} style={menuButtonStyle}><Download size={14} /> Export</button>
                  
                  <div style={{ height: '1px', backgroundColor: '#f5f5f4', margin: '4px 0' }} />
                  <button onClick={(e) => { e.stopPropagation(); onDelete(session.id); setMenuOpen(false); }} style={{ ...menuButtonStyle, color: '#ef4444' }}><Trash2 size={14} color="#ef4444" /> Delete</button>
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: '#a8a29e', whiteSpace: 'nowrap' }}>{session.time}</span>
          )}
        </div>
      )}
    </div>
  );
}

const menuButtonStyle = {
  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', 
  background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer',
  fontSize: '13px', fontWeight: 500, color: '#57534e', textAlign: 'left' as const
};
