import React, { useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchMemories, MemoryData } from '../../../services/memoryService';
import { ChevronDown, ChevronUp, ExternalLink, Shield } from 'lucide-react';

export default function TimelineView({ onOpenMemory }: { onOpenMemory: (id: string) => void }) {
  const { data: rawMemories = [], isLoading: loading } = useSWR('/api/memory', fetchMemories);
  
  const memories = [...rawMemories].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-serif tracking-tight text-[#111111] mb-2">Memory Timeline</h1>
        <p className="text-sm font-medium text-[#666666]">The chronological evolution of your memories.</p>
      </header>
      
      {loading ? (
        <div className="text-center py-10 text-[#A0988A]">Loading timeline...</div>
      ) : memories.length === 0 ? (
        <div className="text-center p-12 bg-[#FFFFFF] border border-dashed border-[#EAEAEA] rounded-[20px] max-w-lg mx-auto mt-10 text-[#78716c]">
          Start chatting and Memora will automatically build memories, entities, goals, habits, and relationships from your conversations.
        </div>
      ) : (
        <div className="relative border-l-2 border-[#EAEAEA] ml-4 pl-8 space-y-6">
          {memories.map((memory, index) => (
            <TimelineCard key={memory.id} memory={memory} index={index} onOpenMemory={onOpenMemory} />
          ))}
        </div>
      )}
    </div>
  );
}

const getTypeColor = (type: string) => {
  switch(type.toLowerCase()) {
    case 'semantic': return 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]';
    case 'episodic': return 'bg-[#FFF7ED] text-[#F97316] border-[#FED7AA]';
    case 'emotional': return 'bg-[#F5F3FF] text-[#8B5CF6] border-[#DDD6FE]';
    case 'procedural': return 'bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]';
    default: return 'bg-[#FAFAF9] text-[#666666] border-[#EAEAEA]';
  }
};

function TimelineCard({ memory, index, onOpenMemory }: { memory: MemoryData, index: number, onOpenMemory: (id: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative bg-[#FFFFFF] border border-[#EAEAEA] rounded-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow duration-300"
    >
      {/* Timeline Node */}
      <div className="absolute -left-[41px] top-6 w-4 h-4 rounded-full bg-white border-4 border-[#2563EB]" />

      {/* Collapsed Header */}
      <div 
        className="p-5 cursor-pointer flex items-start justify-between group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${getTypeColor(memory.type)}`}>
              {memory.type}
            </span>
            <span className="text-xs font-semibold text-[#A0988A]">{memory.timestamp}</span>
            {memory.source && (
              <span className="text-xs font-semibold text-[#A0988A] flex items-center gap-1">
                • {memory.source}
              </span>
            )}
          </div>
          <h3 className="font-medium text-[#111111] line-clamp-2 leading-relaxed group-hover:text-[#2563EB] transition-colors">
            {memory.content.split('\n')[0] || 'Memory...'}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[10px] font-bold text-[#A0988A] uppercase tracking-widest" title="Importance Score">
            <Shield size={14} className={memory.importance > 0.7 ? "text-[#10B981]" : "text-[#A0988A]"} />
            {Math.round(memory.importance * 100)}%
          </div>
          <button className="text-[#A0988A] group-hover:text-[#2563EB] transition-colors mt-2">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#EAEAEA]"
          >
            <div className="p-6 bg-[#FAFAFA] rounded-b-[20px] flex flex-col gap-5">
              <div>
                <h4 className="text-[10px] font-bold text-[#A0988A] uppercase tracking-widest mb-2">Full Content</h4>
                <p className="text-sm text-[#111111] whitespace-pre-wrap leading-relaxed">{memory.content}</p>
              </div>
              
              {(memory.tags ?? []).length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-[#A0988A] uppercase tracking-widest mb-2">Linked Entities</h4>
                  <div className="flex flex-wrap gap-2">
                    {(memory.tags ?? []).map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-[#FFFFFF] border border-[#EAEAEA] text-xs font-medium rounded-lg text-[#666666]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-[#EAEAEA]">
                <button 
                  onClick={(e) => { e.stopPropagation(); onOpenMemory(memory.id); }}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                >
                  <ExternalLink size={14} /> Open Detailed Drawer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
