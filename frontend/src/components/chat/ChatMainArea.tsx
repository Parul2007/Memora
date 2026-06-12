import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatFeed from './ChatFeed';
import ChatInput from './ChatInput';
import EmptyChatState from './EmptyChatState';
import MemoryPanel from './MemoryPanel';
import { Message, MemoryItem, StreamState } from '../../types';
import { apiFetch, ApiError } from '../../services/apiClient';
import { useAuth } from '../../lib/AuthContext';
import { useChatStore } from '../../stores/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { emitMemoryEvent, MEMORY_EVENTS } from '../../lib/events/memory-events';

export default function ChatMainArea() {
  const { user } = useAuth();
  
  const { messages, setMessages, addMessage, activeStreamState, activeMemories, setMemories, setStreamState, appendMessageMemory } = useChatStore();
  const { connectStream } = useChatStream();

  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const isFirstMessageRef = useRef<boolean>(true);

  const [isNewChat, setIsNewChat] = useState(true);
  const [sessionTitle, setSessionTitle] = useState<string>('New Session');
  const [inputValue, setInputValue] = useState('');
  const [memoryPanelCollapsed, setMemoryPanelCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const displayName = user?.user_metadata?.username || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  // Load chat history on mount
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    apiFetch<{ messages: Message[] }>('/api/chat/history/' + sessionId)
      .then(({ messages: history }) => {
        if (history && history.length > 0) {
          setMessages(history);
          setIsNewChat(false);
          isFirstMessageRef.current = false;
        }
      })
      .catch(() => {
        // No history yet — stay in new-chat state
      });
  }, [setMessages]);

  // Listen for the new-chat event from the sidebar
  useEffect(() => {
    const handleNewChat = () => {
      // Abort any in-progress stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setStreamState(StreamState.IDLE);
      sessionIdRef.current = crypto.randomUUID();
      isFirstMessageRef.current = true;
      setMessages([]);
      setIsNewChat(true);
      setIsSaving(false);
      setSessionTitle('New Session');
    };
    window.addEventListener('new-chat', handleNewChat);
    return () => window.removeEventListener('new-chat', handleNewChat);
  }, [setMessages, setStreamState]);

  // Listen for load-session event
  useEffect(() => {
    const handleLoadSession = async (e: Event) => {
      const { sessionId } = (e as CustomEvent).detail;
      // Abort any in-progress stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setStreamState(StreamState.IDLE);
      sessionIdRef.current = sessionId;
      isFirstMessageRef.current = false;
      setIsNewChat(false);
      setMessages([]);
      setSessionTitle('Loading…');

      try {
        const { messages: history } = await apiFetch<{ messages: Message[] }>(
          '/api/chat/history/' + sessionId
        );
        setMessages(history || []);

        const data = await apiFetch<{ sessions: Array<{ id: string; title: string }> }>('/api/sessions/');
        const found = (data.sessions || []).find(s => s.id === sessionId);
        setSessionTitle(found?.title || 'Session');
      } catch {
        setMessages([]);
        setSessionTitle('Session');
      }
    };
    window.addEventListener('load-session', handleLoadSession);
    return () => window.removeEventListener('load-session', handleLoadSession);
  }, [setMessages]);

  const handleSend = async (attachments: {name: string, content: string}[] = []) => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const trimmedInput = inputValue.trim();
    if (trimmedInput.startsWith('/')) {
      if (trimmedInput === '/export') {
        window.open('/api/sessions/export/all', '_blank');
        setInputValue('');
        return;
      }
    }

    let fullPayload = trimmedInput;
    if (attachments.length > 0) {
      const docs = attachments.map(a => `\n\n--- Attached Document: ${a.name} ---\n${a.content}\n--- End Document ---`).join('');
      fullPayload += docs;
    }

    let displayContent = trimmedInput;
    if (attachments.length > 0) {
      displayContent += attachments.map(a => `\n\n*(Attached Document: ${a.name})*`).join('');
    }

    const userMsg: Message = {
      id: `m${Date.now()}`,
      role: 'user',
      content: displayContent || 'Sent an attachment.',
      timestamp: 'Just now',
      status: 'complete'
    };

    addMessage(userMsg);
    setInputValue('');
    setIsNewChat(false);

    // Placeholder for optimistic UI
    const assistantId = `a${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: 'Just now',
      status: 'sending'
    };
    addMessage(assistantMsg);

    const isFirst = isFirstMessageRef.current;
    if (isFirst) {
      isFirstMessageRef.current = false;
      window.dispatchEvent(new CustomEvent('session-created', {
        detail: { sessionId: sessionIdRef.current }
      }));
    }

    try {
      abortControllerRef.current = new AbortController();
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const streamUrl = `${baseUrl.replace(/\/$/, '')}/api/chat/stream`;

      await connectStream(streamUrl, {
        user_id: user?.id || '00000000-0000-0000-0000-000000000001',
        session_id: sessionIdRef.current,
        content: fullPayload || 'Sent an attachment.',
        stream: true,
      }, assistantId, abortControllerRef.current.signal);

      if (isFirst) {
        setTimeout(() => window.dispatchEvent(new CustomEvent('session-updated')), 4000);
        setTimeout(() => window.dispatchEvent(new CustomEvent('session-updated')), 10000);
      }

    } catch (err: any) {
      console.error(err);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleEndSession = async () => {
    setIsSaving(true);
    try {
      await apiFetch('/api/chat/session/' + sessionIdRef.current, { method: 'DELETE' });
    } catch {
    } finally {
      sessionIdRef.current = crypto.randomUUID();
      isFirstMessageRef.current = true;
      setMessages([]);
      setIsNewChat(true);
      setIsSaving(false);
      setSessionTitle('New Session');
      window.dispatchEvent(new CustomEvent('session-updated'));
    }
  };

  const handleRenameSession = async (newTitle: string) => {
    setSessionTitle(newTitle);
    try {
      await apiFetch(`/api/sessions/${sessionIdRef.current}/title`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle }),
      });
      window.dispatchEvent(new CustomEvent('session-updated'));
    } catch {}
  };

  const handleExport = async () => {
    if (isNewChat) return;
    try {
      const data = await apiFetch(`/api/sessions/${sessionIdRef.current}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handleDelete = async () => {
    if (isNewChat) return;
    try {
      await apiFetch(`/api/sessions/${sessionIdRef.current}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('new-chat'));
      window.dispatchEvent(new CustomEvent('session-updated'));
    } catch (e) {}
  };

  const handleRegenerate = async (messageId: string) => {
    if (messages.length < 2) return;
    
    let lastUserMessage: Message | null = null;
    let newMessages = [...messages];
    
    // Find the last assistant message and the preceding user message
    for (let i = newMessages.length - 1; i >= 0; i--) {
      if (newMessages[i].role === 'user') {
        lastUserMessage = newMessages[i];
        // Truncate messages after this user message
        newMessages = newMessages.slice(0, i + 1);
        break;
      }
    }
    
    if (!lastUserMessage) return;
    
    const assistantId = `a${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: 'Just now',
      status: 'sending'
    };
    
    setMessages([...newMessages, assistantMsg]);
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const streamUrl = `${baseUrl.replace(/\/$/, '')}/api/chat/stream`;

    try {
      abortControllerRef.current = new AbortController();
      await connectStream(streamUrl, {
        user_id: user?.id || '00000000-0000-0000-0000-000000000001',
        session_id: sessionIdRef.current,
        content: lastUserMessage.content,
        stream: true,
      }, assistantId, abortControllerRef.current.signal);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    
    const truncated = messages.slice(0, msgIndex);
    
    const userMsg: Message = {
      id: `m${Date.now()}`,
      role: 'user',
      content: newContent,
      timestamp: 'Just now',
      status: 'complete'
    };
    
    const assistantId = `a${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: 'Just now',
      status: 'sending'
    };
    
    setMessages([...truncated, userMsg, assistantMsg]);
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const streamUrl = `${baseUrl.replace(/\/$/, '')}/api/chat/stream`;

    try {
      abortControllerRef.current = new AbortController();
      await connectStream(streamUrl, {
        user_id: user?.id || '00000000-0000-0000-0000-000000000001',
        session_id: sessionIdRef.current,
        content: newContent,
        stream: true,
      }, assistantId, abortControllerRef.current.signal);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFeedback = async (messageId: string, rating: 'up' | 'down') => {
    try {
      await apiFetch('/api/chat/feedback', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          message_id: messageId,
          rating
        })
      });
    } catch (e) {
      console.error("Failed to submit feedback", e);
    }
  };

  const handleUpdateMemory = async (memoryId: string, newContent: string) => {
    try {
      await apiFetch(`/api/memory/${memoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: newContent })
      });
      setMemories(activeMemories.map(m => m.id === memoryId ? { ...m, content: newContent } : m));
      emitMemoryEvent(MEMORY_EVENTS.MemoryUpdated, { memoryId });
    } catch (e) {
      console.error("Failed to update memory", e);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await apiFetch(`/api/memory/${memoryId}`, { method: 'DELETE' });
      setMemories(activeMemories.filter(m => m.id !== memoryId));
      emitMemoryEvent(MEMORY_EVENTS.MemoryDeleted, { memoryId });
    } catch (e) {
      console.error("Failed to delete memory", e);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
        
        {isSaving && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
            <div style={{ backgroundColor: '#11120D', color: '#FFFBF4', padding: '12px 24px', borderRadius: '9999px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #565449', borderTopColor: '#FFFBF4', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Consolidating session memories...
            </div>
          </div>
        )}

        <ChatHeader 
          sessionTitle={isNewChat ? 'New Session' : sessionTitle} 
          onRename={handleRenameSession}
          onEndSession={handleEndSession}
          onExport={handleExport}
          onDelete={handleDelete}
        />

        {isNewChat ? (
          <EmptyChatState userName={displayName} isNewUser={true} onSuggestionClick={(text) => { setInputValue(text); }} />
        ) : (
          <ChatFeed 
            messages={messages} 
            isTyping={activeStreamState !== StreamState.IDLE && activeStreamState !== StreamState.COMPLETE} 
            onMemoryPillClick={() => setMemoryPanelCollapsed(false)} 
            onRegenerate={handleRegenerate} 
            onEditMessage={handleEditMessage} 
            onFeedback={handleFeedback} 
          />
        )}

        <ChatInput 
          value={inputValue} 
          onChange={setInputValue} 
          onSend={handleSend} 
          isGenerating={activeStreamState !== StreamState.IDLE && activeStreamState !== StreamState.COMPLETE} 
          onStop={handleStop} 
        />
      </div>

      {!isNewChat && (
        <MemoryPanel 
          isCollapsed={memoryPanelCollapsed} 
          onToggle={() => setMemoryPanelCollapsed(!memoryPanelCollapsed)}
          onUpdateMemory={handleUpdateMemory}
          onDeleteMemory={handleDeleteMemory}
          sessionId={sessionIdRef.current}
        />
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
