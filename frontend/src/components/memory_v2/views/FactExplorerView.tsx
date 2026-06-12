import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { fetchMemories, MemoryData } from '../../../services/memoryService';
import useSWR from 'swr';
import { Filter } from 'lucide-react';

export default function FactExplorerView({ onOpenMemory }: { onOpenMemory: (id: string) => void }) {
  const { data: memories = [], isLoading: loading } = useSWR('/api/memory', fetchMemories);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');

  const filteredMemories = useMemo(() => {
    return memories.filter(mem => {
      if (typeFilter !== 'all' && mem.type !== typeFilter) return false;
      if (importanceFilter === 'high' && mem.importance < 0.7) return false;
      if (importanceFilter === 'low' && mem.importance >= 0.7) return false;
      return true;
    });
  }, [memories, typeFilter, importanceFilter]);

  const getTypeColor = (type: string) => {
    switch(type.toLowerCase()) {
      case 'semantic': return 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]';
      case 'episodic': return 'bg-[#FFF7ED] text-[#F97316] border-[#FED7AA]';
      case 'emotional': return 'bg-[#F5F3FF] text-[#8B5CF6] border-[#DDD6FE]';
      case 'procedural': return 'bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]';
      default: return 'bg-[#FAFAF9] text-[#666666] border-[#EAEAEA]';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full flex flex-col h-full">
      <header className="mb-8">
        <h1 className="text-3xl font-serif tracking-tight text-[#111111] mb-2">Fact Explorer</h1>
        <p className="text-sm font-medium text-[#666666]">Browse and filter all raw memory objects.</p>
      </header>

      {/* Control Bar */}
      <div className="flex items-center gap-5 mb-8 bg-[#FFFFFF] p-5 rounded-[20px] border border-[#EAEAEA] shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <div className="flex items-center gap-2 text-[#A0988A]">
          <Filter size={18} className="text-[#2563EB]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Filters</span>
        </div>
        <div className="w-px h-6 bg-[#EAEAEA] mx-2" />
        
        <select 
          value={typeFilter} 
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl px-4 py-2 text-sm font-medium text-[#111111] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="semantic">Semantic</option>
          <option value="episodic">Episodic</option>
          <option value="emotional">Emotional</option>
          <option value="procedural">Procedural</option>
        </select>

        <select 
          value={importanceFilter} 
          onChange={e => setImportanceFilter(e.target.value)}
          className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl px-4 py-2 text-sm font-medium text-[#111111] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors cursor-pointer"
        >
          <option value="all">All Importance</option>
          <option value="high">High (&gt;70%)</option>
          <option value="low">Low (&lt;70%)</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-[#A0988A]">Loading facts...</div>
      ) : memories.length === 0 ? (
        <div className="text-center p-12 bg-[#FFFFFF] border border-dashed border-[#EAEAEA] rounded-[20px] max-w-lg mx-auto mt-10 text-[#78716c]">
          Start chatting and Memora will automatically build memories, entities, goals, habits, and relationships from your conversations.
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="text-center py-10 text-[#A0988A]">No facts match the current filters.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 flex-1 overflow-y-auto content-start pb-10 pr-2">
          {filteredMemories.map((mem, idx) => (
            <motion.div
              key={mem.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(idx * 0.02, 0.5) }}
              onClick={() => onOpenMemory(mem.id)}
              className="bg-[#FFFFFF] border border-[#EAEAEA] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:border-[#BFDBFE] transition-all duration-300 cursor-pointer flex flex-col gap-4 h-52 group"
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${getTypeColor(mem.type)}`}>
                  {mem.type}
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#A0988A]">
                  {Math.round(mem.importance * 100)}% Imp
                </span>
              </div>
              
              <h3 className="text-sm font-medium text-[#111111] line-clamp-3 leading-relaxed flex-1 group-hover:text-[#2563EB] transition-colors">
                {mem.content}
              </h3>
              
              <div className="flex justify-between items-center text-xs font-semibold text-[#A0988A] pt-3 border-t border-[#EAEAEA]">
                <span>{mem.timestamp}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
