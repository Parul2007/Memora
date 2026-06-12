import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { fetchMemories, MemoryData } from '../../../services/memoryService';
import { ExternalLink } from 'lucide-react';
import useSWR from 'swr';

export default function LearningView({ onOpenMemory }: { onOpenMemory: (id: string) => void }) {
  const { data: memories = [], isLoading: loading } = useSWR('/api/memory', fetchMemories);

  const topics = useMemo(() => {
    const groups: Record<string, MemoryData[]> = {};
    
    memories.forEach(mem => {
      if (Array.isArray(mem.tags) && mem.tags.length > 0) {
        const uniqueTags = Array.from(new Set(mem.tags));
        uniqueTags.forEach(tag => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(mem);
        });
      } else {
        if (!groups['Uncategorized']) groups['Uncategorized'] = [];
        groups['Uncategorized'].push(mem);
      }
    });

    return Object.entries(groups)
      .map(([topic, memories]) => ({ topic, memories }))
      .sort((a, b) => b.memories.length - a.memories.length);
  }, [memories]);

  return (
    <div className="p-8 max-w-6xl mx-auto w-full flex flex-col h-full">
      <header className="mb-10">
        <h1 className="text-3xl font-serif tracking-tight text-[#111111] mb-2">Learning Patterns</h1>
        <p className="text-sm font-medium text-[#666666]">How Memora's understanding is evolving across topics and concepts.</p>
      </header>
      
      {loading ? (
        <div className="text-center py-10 text-[#A0988A]">Analyzing learning patterns...</div>
      ) : topics.length === 0 ? (
        <div className="text-center p-12 bg-[#FFFFFF] border border-dashed border-[#EAEAEA] rounded-[20px] max-w-lg mx-auto mt-10 text-[#78716c]">
          Start chatting and Memora will automatically group related memories into topics.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 flex-1 overflow-y-auto content-start pb-10 pr-2">
          {topics.map((group, idx) => {
            return (
              <motion.div 
                key={group.topic}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[#FFFFFF] border border-[#EAEAEA] rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#BFDBFE] transition-all duration-300 flex flex-col h-[380px]"
              >
                <div className="bg-[#EFF6FF] px-6 py-5 border-b border-[#BFDBFE] flex justify-between items-center transition-colors">
                  <h3 className="font-semibold text-lg text-[#1D4ED8] truncate">{group.topic}</h3>
                  <span className="text-[10px] font-bold tracking-widest bg-[#FFFFFF] border border-[#BFDBFE] px-3 py-1 rounded-lg text-[#1D4ED8] shadow-sm">
                    {group.memories.length} MEMORIES
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                  {group.memories.map((mem, memIdx) => (
                    <div 
                      key={`${mem.id}-${memIdx}`} 
                      onClick={() => onOpenMemory(mem.id)}
                      className="text-sm font-medium text-[#666666] hover:text-[#111111] cursor-pointer group flex items-start gap-4 transition-colors"
                    >
                      <span className="text-[#3B82F6] opacity-40 group-hover:opacity-100 transition-opacity mt-1 text-[10px]">●</span>
                      <span className="line-clamp-3 flex-1 leading-relaxed">{mem.content}</span>
                      <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0 text-[#A0988A] group-hover:text-[#2563EB]" />
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
