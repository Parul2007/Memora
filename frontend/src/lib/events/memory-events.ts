'use client';
/**
 * Centralized Event Bus for Frontend Reactivity
 */
import { mutate } from 'swr';
import { supabase } from '../supabase';

export const MEMORY_EVENTS = {
    MemoryUpdated: 'memora:MemoryUpdated',
    MemoryDeleted: 'memora:MemoryDeleted',
    GraphUpdated: 'memora:GraphUpdated',
    IntelligenceUpdated: 'memora:IntelligenceUpdated',
    EvolutionUpdated: 'memora:EvolutionUpdated',
    PredictiveUpdated: 'memora:PredictiveUpdated',

} as const;

export type MemoryEventType = typeof MEMORY_EVENTS[keyof typeof MEMORY_EVENTS];

export function emitMemoryEvent(eventType: MemoryEventType, detail: any = {}) {
    if (typeof window === 'undefined') return;
    console.log(`[Event Bus] Emitting: ${eventType}`);
    const event = new CustomEvent(eventType, { detail });
    window.dispatchEvent(event);
}

export function subscribeToMemoryEvent(eventType: MemoryEventType, callback: (detail: any) => void) {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => {
        const customEvent = e as CustomEvent;
        callback(customEvent.detail);
    };
    window.addEventListener(eventType, handler);
    return () => window.removeEventListener(eventType, handler);
}

export function invalidateQueries(keys: string[]) {
    console.log(`[SWR Invalidator] Invalidating keys starting with:`, keys);
    mutate(
        (key: any) => {
            if (typeof key !== 'string') return false;
            return keys.some(k => key.startsWith(k) || key.includes(k));
        },
        undefined,
        { revalidate: true }
    );
}

let sseReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;
let activeSSE: EventSource | null = null;
let isInitialized = false;

async function connectSSE() {
    if (typeof window === 'undefined') return;
    
    // Close existing connection if any to prevent socket leaks
    if (activeSSE) {
        console.log('[SSE] Closing existing EventSource connection to prevent socket leaks');
        activeSSE.close();
        activeSSE = null;
    }
    
    let token = '';
    try {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || '';
    } catch (e) {
        console.error('[SSE] Failed to retrieve session token:', e);
    }
    
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = token 
        ? `${BASE_URL}/api/events/stream?token=${encodeURIComponent(token)}`
        : `${BASE_URL}/api/events/stream`;
        
    console.log('[SSE] Connecting to:', url);
    const sse = new EventSource(url);
    activeSSE = sse;
    
    sse.onopen = () => {
        console.log('[SSE] Connection established');
        sseReconnectAttempts = 0;
    };
    
    sse.onmessage = (event) => {
        console.log("[SSE] Received event:", event.type, event.data);
    };
    
    sse.addEventListener('MemoryCreated', (e) => emitMemoryEvent(MEMORY_EVENTS.MemoryUpdated, e.data));
    sse.addEventListener('MemoryUpdated', (e) => emitMemoryEvent(MEMORY_EVENTS.MemoryUpdated, e.data));
    sse.addEventListener('MemoryDeleted', (e) => emitMemoryEvent(MEMORY_EVENTS.MemoryDeleted, e.data));
    sse.addEventListener('GraphUpdated', (e) => emitMemoryEvent(MEMORY_EVENTS.GraphUpdated, e.data));
    sse.addEventListener('IntelligenceUpdated', (e) => emitMemoryEvent(MEMORY_EVENTS.IntelligenceUpdated, e.data));
    sse.addEventListener('EvolutionUpdated', (e) => emitMemoryEvent(MEMORY_EVENTS.EvolutionUpdated, e.data));
    sse.addEventListener('PredictionUpdated', (e) => emitMemoryEvent(MEMORY_EVENTS.PredictiveUpdated, e.data));

    
    sse.onerror = (err) => {
        sse.close();
        if (activeSSE === sse) {
            activeSSE = null;
        }
        
        if (sseReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('[SSE] Max reconnection attempts reached. Giving up.');
            return;
        }
        
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, sseReconnectAttempts) + Math.random() * 1000;
        sseReconnectAttempts++;
        console.log(`[SSE] Connection lost. Reconnecting in ${delay}ms (attempt ${sseReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        setTimeout(() => {
            if (!activeSSE) {
                connectSSE();
            }
        }, delay);
    };
}

export function initializeGlobalReactivity() {
    if (typeof window === 'undefined') return;
    
    // Mount once in root layout
    if (isInitialized) {
        if (!activeSSE) {
            connectSSE();
        }
        return;
    }
    
    isInitialized = true;

    // Clean up EventSource connection before page unloading
    window.addEventListener('beforeunload', () => {
        if (activeSSE) {
            activeSSE.close();
            activeSSE = null;
        }
    });

    // Automatically reconnect when the browser recovers from sleep or comes back online
    window.addEventListener('online', () => {
        console.log('[SSE] Browser came back online, re-initializing SSE...');
        connectSSE();
    });
    
    // Mount once in root layout
    subscribeToMemoryEvent(MEMORY_EVENTS.IntelligenceUpdated, () => {
        invalidateQueries(['/api/intelligence']);
    });

    subscribeToMemoryEvent(MEMORY_EVENTS.GraphUpdated, () => {
        invalidateQueries(['/api/graph']);
    });

    subscribeToMemoryEvent(MEMORY_EVENTS.PredictiveUpdated, () => {
        invalidateQueries(['/api/predictive']);
    });

    subscribeToMemoryEvent(MEMORY_EVENTS.MemoryUpdated, () => {
        invalidateQueries(['/api/memory', '/api/graph', '/api/goals', '/api/dashboard', '/api/intelligence', '/api/predictive']);
    });
    
    subscribeToMemoryEvent(MEMORY_EVENTS.MemoryDeleted, () => {
        invalidateQueries(['/api/memory', '/api/graph', '/api/goals', '/api/dashboard', '/api/intelligence', '/api/predictive']);
    });
    

    
    // Connect to Server-Sent Events from Redis Pub/Sub with auto-reconnect
    connectSSE();
}
