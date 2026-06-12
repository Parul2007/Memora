import { useChatStore } from '../stores/chatStore';
import { StreamState, MemoryItem } from '../types';
import { emitMemoryEvent, MEMORY_EVENTS } from '../lib/events/memory-events';

export function useChatStream() {
  const { 
    updateActiveMessage, 
    updateMessageStatus, 
    setStreamState, 
    setMemories, 
    updateMessageMemories,
    setThinking, 
    setCompleted,
    setError,
    addIntelligenceEvent,
    clearIntelligenceEvents,
    commitIntelligenceEvents
  } = useChatStore();

  const connectStream = async (url: string, payload: any, messageId: string, signal?: AbortSignal) => {
    try {
      // Fetch access token directly from localStorage Supabase key
      let token = '';
      try {
        const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (sbKey) {
          const authData = JSON.parse(localStorage.getItem(sbKey) || '{}');
          token = authData.access_token || '';
        }
      } catch (err) {
        console.error('Error fetching Supabase token for stream:', err);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      clearIntelligenceEvents();

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        let errBody = '';
        try { errBody = await response.text(); } catch(_) {}
        console.error(`Stream request failed: URL=${url} Status=${response.status} Body=${errBody}`);
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) throw new Error('No reader available');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n\r?\n/);
        
        // Keep the last incomplete part in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          const eventMatch = line.match(/^event: (.*)/m);
          const dataMatch = line.match(/^data: (.*)/m);
          
          if (!eventMatch || !dataMatch) continue;
          
          const event = eventMatch[1].trim();
          const rawData = dataMatch[1].trim();

          if (rawData === '[DONE]') {
            setStreamState(StreamState.COMPLETE);
            commitIntelligenceEvents(messageId);
            continue;
          }

          let data: any = {};
          try {
            data = JSON.parse(rawData);
          } catch (e) {
            data = { text: rawData };
          }

          if (event === 'status') {
            if (data.state === 'memory_started') {
              setStreamState(StreamState.RETRIEVING);
              updateMessageStatus(messageId, 'retrieving');
            } else if (data.state === 'memory_complete') {
              // Details has retrieved count
              setThinking(messageId, 'ranking relevance', undefined, data.details?.retrieved);
            } else if (data.state === 'reflection_started') {
              setStreamState(StreamState.REFLECTING);
              updateMessageStatus(messageId, 'reflecting');
            }
          } else if (event === 'thinking') {
            setStreamState(StreamState.THINKING);
            updateMessageStatus(messageId, 'thinking');
            setThinking(messageId, data.phase);
          } else if (event === 'token') {
            setStreamState(StreamState.GENERATING);
            updateMessageStatus(messageId, 'streaming');
            updateActiveMessage(data.text);
          } else if (event === 'metadata') {
            if (data.memories) {
              setMemories(data.memories);
              updateMessageMemories(messageId, data.memories);
            }
          } else if (event === 'complete') {
            setStreamState(StreamState.COMPLETE);
            setCompleted(messageId, data.tokens, data.duration_ms);
            commitIntelligenceEvents(messageId);
          } else if (['memory_candidate', 'memory_created', 'entity_extracted', 'graph_update', 'retrieval_complete', 'goal_tracked'].includes(event)) {
            addIntelligenceEvent({ type: event, data, timestamp: new Date().toISOString() });
          } else if (event === 'error') {
            setStreamState(StreamState.ERROR);
            setError(messageId, data.message || 'An error occurred during processing.');
          }
        }
      }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // User explicitly cancelled — treat as complete, not error
          setStreamState(StreamState.COMPLETE);
          setCompleted(messageId, 0, 0);
        } else {
          console.error("Stream failed:", err);
          setStreamState(StreamState.ERROR);
          setError(messageId, err?.message || 'Connection lost. Please try again.');
        }
    }
  };

  return { connectStream };
}
