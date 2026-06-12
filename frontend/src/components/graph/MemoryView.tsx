import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { fetchMemory, MemoryData } from '../../services/memoryService';
import useSWR from 'swr';

export default function MemoryView({ 
  memoryId, 
  isOpen, 
  onClose
}: { 
  memoryId: string | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  // Use the service-layer fetcher so the backend response is normalised through
  // toMemoryData() — which maps `entities → tags` and always defaults tags to [].
  // Previously this used apiFetch<any> directly, so `memory.tags` was undefined
  // (the backend field is called `entities`, not `tags`).
  const { data: memory, isLoading: loading } = useSWR<MemoryData>(
    isOpen && memoryId ? ['memory-view', memoryId] : null,
    ([, id]: [string, string]) => fetchMemory(id)
  );

  // Derive a guaranteed array so JSX never calls .length or .map on undefined.
  const tags: string[] = memory?.tags ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white rounded-2xl w-[90%] max-w-[500px] max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-[#e7e5e4] px-6 py-4 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[#F0EFEA] text-[#565449] flex items-center justify-center hover:bg-[#e7e5e4] transition-colors"
                >
                  <X size={16} />
                </button>
                <div>
                  <h1 className="text-2xl font-serif font-bold text-[#11120D]">Memory</h1>
                  <p className="text-[#78716c] text-sm">Memory Details</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-16 bg-[#F0EFEA] rounded-xl"></div>
                  <div className="h-24 bg-[#F0EFEA] rounded-xl"></div>
                  <div className="h-16 bg-[#F0EFEA] rounded-xl"></div>
                </div>
              ) : memory ? (
                <>
                  <div className="space-y-3">
                    <p className="text-[#11120D] leading-relaxed">{memory.content}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-[#565449]">
                      <span className="text-xs font-semibold px-2 py-1 bg-[#F0EFEA] text-[#565449] rounded uppercase tracking-wider">
                        {memory.type}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 bg-[#F0EFEA] text-[#565449] rounded uppercase tracking-wider">
                        Importance: {Math.round(memory.importance * 10)}/10
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 bg-[#F0EFEA] text-[#565449] rounded uppercase tracking-wider">
                        Accessed: {memory.accessed}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 bg-[#F0EFEA] text-[#565449] rounded uppercase tracking-wider">
                        {memory.timestamp}
                      </span>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, idx) => (
                          <span key={idx} className="text-xs font-semibold px-2 py-1 bg-[#E8F0FE] text-[#1967D2] rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#A0988A]">Memory not found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}