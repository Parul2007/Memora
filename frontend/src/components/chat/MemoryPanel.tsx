import React, { useMemo } from 'react';
import { ChevronRight, ChevronLeft, BrainCircuit, Download, Database, Network, FileText, CheckCircle2, Target } from 'lucide-react';
import { MemoryItem, Message, StreamState } from '../../types';
import MemoryCard from './MemoryCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/chatStore';

import { 
  ScoreBadge, 
  MemoryLearningCard, 
  KnowledgeGraphCard, 
  MemoryRetrievalCard, 
  parseCognitiveBlocks, 
  CognitiveBlock 
} from './CognitiveBlocks';

export default function MemoryPanel({ 
  isCollapsed, 
  onToggle, 
  onUpdateMemory, 
  onDeleteMemory,
  sessionId 
}: { 
  isCollapsed: boolean, 
  onToggle: () => void, 
  onUpdateMemory?: (id: string, content: string) => void, 
  onDeleteMemory?: (id: string) => void,
  sessionId?: string | null
}) {
  const { messages, activeStreamState, intelligenceEvents } = useChatStore();

  const liveBlocks = useMemo(() => {
    return parseCognitiveBlocks(intelligenceEvents, 'live');
  }, [intelligenceEvents]);

  const sessionBlocks = useMemo(() => {
    const blocks: CognitiveBlock[] = [];
    messages.forEach((msg, mIdx) => {
      if (msg.role === 'assistant') {
        if (msg.metadata?.pipeline_flow) {
          const parsed = parseCognitiveBlocks(msg.metadata.pipeline_flow, `msg-${mIdx}`);
          blocks.push(...parsed);
        } else if (msg.memories && msg.memories.length > 0) {
          msg.memories.forEach((mem, i) => {
            blocks.push({
              id: `old-${mIdx}-${i}`,
              type: 'learning',
              timestamp: msg.createdAt || '',
              data: { memory: { ...mem, memory_type: (mem as any).memory_type || mem.type || 'semantic' }, status: 'persisted' }
            });
          });
        }
      }
    });
    return blocks;
  }, [messages]);

  // Aggregate Learnings & Goals across the whole session (Newest First)
  const accumulatedLearnings = useMemo(() => {
    const combined = [...sessionBlocks, ...liveBlocks];
    const unique = new Map<string, CognitiveBlock>();
    combined.forEach(b => {
      if (b.type === 'learning' && b.data.memory) {
        // Deduplicate by memory content to prevent double rendering
        unique.set('learning:' + b.data.memory.content, b);
      } else {
        unique.set(b.id, b);
      }
    });
    return Array.from(unique.values())
      .filter(b => b.type === 'learning')
      .reverse();
  }, [sessionBlocks, liveBlocks]);

  // Isolate Current Context (Only for the latest prompt)
  const currentContext = useMemo(() => {
    if (activeStreamState !== StreamState.IDLE && activeStreamState !== StreamState.COMPLETE && activeStreamState !== StreamState.ERROR) {
      return liveBlocks.filter(b => b.type === 'retrieval' || b.type === 'graph');
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        if (messages[i].metadata?.pipeline_flow) {
          return parseCognitiveBlocks(messages[i].metadata.pipeline_flow).filter(b => b.type === 'retrieval' || b.type === 'graph');
        }
        break;
      }
    }
    return [];
  }, [liveBlocks, messages, activeStreamState]);

  // Count total memory items for the collapse badge
  const totalMemoriesCount = useMemo(() => {
    return accumulatedLearnings.filter(b => b.type === 'learning').length;
  }, [accumulatedLearnings]);

  const handleExport = () => {
    const memoriesToExport = accumulatedLearnings.filter(b => b.type === 'learning').map(b => b.data.memory);
    const blob = new Blob([JSON.stringify(memoriesToExport, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_memory_context_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isCollapsed) {
    return (
      <div 
        style={{ width: '40px', backgroundColor: '#FAFAF9', borderLeft: '1px solid #e7e5e4', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', cursor: 'pointer', flexShrink: 0 }}
        onClick={onToggle}
        title="Open Intelligence Engine"
      >
        <ChevronLeft size={16} color="#A0988A" style={{ marginBottom: '16px' }} />
        {totalMemoriesCount > 0 && (
          <div style={{ backgroundColor: '#fef3c7', color: '#d97706', fontSize: '10px', fontWeight: 700, padding: '4px 6px', borderRadius: '8px', transform: 'rotate(90deg)', marginTop: '24px', whiteSpace: 'nowrap' }}>
            {totalMemoriesCount} MEMORIES
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '400px', backgroundColor: '#FAFAF9', borderLeft: '1px solid #e7e5e4', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.6; transform: scale(0.9); }
        }
      `}</style>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e7e5e4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BrainCircuit size={16} color="#565449" />
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: '#11120D', fontFamily: 'monospace' }}>
            COGNITIVE ENGINE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {totalMemoriesCount > 0 && (
            <button onClick={handleExport} title="Export Session Memories" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px', color: '#A0988A' }}>
              <Download size={14} />
            </button>
          )}
          <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <ChevronRight size={16} color="#A0988A" />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '20px', gap: '32px' }}>
        
        {/* Section A: Current Engine Context (Only latest prompt) */}
        {(currentContext.length > 0 || activeStreamState !== StreamState.IDLE) && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#78716c', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px', borderBottom: '1px solid #e7e5e4', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Engine Context</span>
              {activeStreamState !== StreamState.IDLE && activeStreamState !== StreamState.COMPLETE && activeStreamState !== StreamState.ERROR && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ color: '#22c55e', fontSize: '9px' }}>PROCESSING</span>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <AnimatePresence>
                {currentContext.map((block) => (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {block.type === 'graph' && <KnowledgeGraphCard data={block.data} />}
                    {block.type === 'retrieval' && <MemoryRetrievalCard data={block.data} />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Section B: Session Extractions (Accumulated over the chat) */}
        {accumulatedLearnings.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#78716c', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px', borderBottom: '1px solid #e7e5e4', paddingBottom: '4px' }}>
              Session Extractions
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <AnimatePresence>
                {accumulatedLearnings.map((block) => (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    {block.type === 'learning' && <MemoryLearningCard data={block.data} />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
