import React, { useState, useEffect } from 'react';
import { Search, Filter, Box } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch } from '../../services/apiClient';
import useSWR from 'swr';

interface EntityData {
  name: string;
  label: string;
  mentions: number;
  relationships: number;
  updated_at: string;
}

export default function EntityExplorerView({ onOpenEntity }: { onOpenEntity: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const delay = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(delay);
  }, [search]);

  const key = `/api/graph/entities?search=${encodeURIComponent(debouncedSearch)}`;
  const { data, isLoading: loading } = useSWR(key, (url: string) => apiFetch<any>(url));
  const entities: EntityData[] = data?.entities || [];

  return (
    <div className="flex min-h-0 h-full flex-col bg-[#FAFAFA]">
      <div className="p-8 border-b border-[#EAEAEA] bg-[#FFFFFF] flex-shrink-0">
        <h1 className="text-3xl font-serif tracking-tight text-[#111111] mb-6">Entity Explorer</h1>
        
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0988A]" size={16} />
            <input
              type="text"
              placeholder="Search entities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-[#FFFFFF] rounded-[20px] border border-[#EAEAEA]"></div>)}
          </div>
        ) : entities.length === 0 ? (
          <div className="flex justify-center items-center h-64 text-[#A0988A]">
            <p className="text-sm text-[#666666] mt-1 bg-[#FFFFFF] p-8 rounded-[20px] border border-dashed border-[#EAEAEA]">Start chatting and Memora will automatically build memories, entities, goals, habits, and relationships from your conversations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            {entities.map(e => (
              <motion.div
                key={e.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FFFFFF] border border-[#EAEAEA] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#BFDBFE] transition-all duration-300 cursor-pointer group"
                onClick={() => onOpenEntity(e.name)}
              >
                <div className="flex justify-between items-start mb-5">
                  <h3 className="font-semibold text-[#111111] text-lg group-hover:text-[#2563EB] transition-colors truncate pr-2">{e.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#FAFAFA] text-[#666666] border border-[#EAEAEA]">{e.label}</span>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-[#78716c]">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#A0988A]">Mentions</span>
                    <span className="font-semibold text-[#111111]">{e.mentions}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#A0988A]">Relations</span>
                    <span className="font-semibold text-[#111111]">{e.relationships}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
