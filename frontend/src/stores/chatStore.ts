import { create } from 'zustand';
import { Message, StreamState, MemoryItem } from '../types';

interface ChatState {
  messages: Message[];
  activeStreamState: StreamState;
  activeMemories: MemoryItem[];
  intelligenceEvents: any[];
  
  setMessages: (messages: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateActiveMessage: (chunk: string) => void;
  updateMessageStatus: (id: string, status: string) => void;
  setStreamState: (state: StreamState) => void;
  setMemories: (memories: MemoryItem[]) => void;
  updateMessageMemories: (id: string, memories: MemoryItem[]) => void;
  setThinking: (id: string, phase: string, duration?: number, memoriesUsed?: number) => void;
  setCompleted: (id: string, tokens: number, duration: number) => void;
  appendMessageMemory: (memory: MemoryItem) => void;
  setError: (id: string, errorMessage?: string) => void;
  addIntelligenceEvent: (event: any) => void;
  clearIntelligenceEvents: () => void;
  commitIntelligenceEvents: (messageId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  activeStreamState: StreamState.IDLE,
  activeMemories: [],
  intelligenceEvents: [],
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (msg) => set((state) => ({ 
    messages: [...state.messages, msg] 
  })),
  
  updateActiveMessage: (chunk) => set((state) => {
    const msgs = [...state.messages];
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      if (last.role === 'assistant') {
        // Create a NEW object — do NOT mutate in place or React skips re-renders
        msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
      }
    }
    return { messages: msgs };
  }),
  
  updateMessageStatus: (id, status) => set((state) => {
    return {
      messages: state.messages.map(msg => 
        msg.id === id ? { ...msg, status } : msg
      )
    };
  }),
  
  setStreamState: (state) => set({ activeStreamState: state }),
  
  setMemories: (memories) => set({ activeMemories: memories }),
  
  updateMessageMemories: (id, memories) => set((state) => {
    return {
      messages: state.messages.map(msg => 
        msg.id === id ? { ...msg, memories } : msg
      )
    };
  }),
  
  setThinking: (id, phase, duration, memoriesUsed) => set((state) => {
    return {
      messages: state.messages.map(msg => 
        msg.id === id ? { 
          ...msg, 
          thinking: { 
            phase, 
            duration: duration ?? msg.thinking?.duration,
            memoriesUsed: memoriesUsed ?? msg.thinking?.memoriesUsed 
          } 
        } : msg
      )
    };
  }),
  
  setCompleted: (id, tokens, duration) => set((state) => {
    return {
      messages: state.messages.map(msg => 
        msg.id === id ? { ...msg, status: 'complete', tokens, duration } : msg
      )
    };
  }),
  
  setError: (id, errorMessage) => set((state) => {
    return {
      messages: state.messages.map(msg =>
        msg.id === id ? { ...msg, status: 'failed', isError: true, content: errorMessage || msg.content } : msg
      )
    };
  }),

  appendMessageMemory: (memory) => set((state) => {
    const msgs = [...state.messages];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') {
        const existingMemories = msgs[i].memories || [];
        // prevent exact duplicates
        if (!existingMemories.find(m => m.id === memory.id)) {
            msgs[i] = { ...msgs[i], memories: [...existingMemories, memory] };
        }
        break;
      }
    }
    return { messages: msgs };
  }),
  
  addIntelligenceEvent: (event) => set((state) => ({
    intelligenceEvents: [...state.intelligenceEvents, event]
  })),
  
  clearIntelligenceEvents: () => set({ intelligenceEvents: [] }),
  
  commitIntelligenceEvents: (id) => set((state) => {
    return {
      messages: state.messages.map(msg => 
        msg.id === id ? { 
          ...msg, 
          metadata: { 
            ...(msg.metadata || {}), 
            pipeline_flow: state.intelligenceEvents 
          } 
        } : msg
      )
    };
  })
}));
