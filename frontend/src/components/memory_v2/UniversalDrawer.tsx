import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Archive, Trash2, Edit3, Pin, ShieldAlert, Link as LinkIcon, Info, Sparkles } from 'lucide-react';
import { fetchMemory, MemoryData, deleteMemory } from '../../services/memoryService';
import { apiFetch } from '../../services/apiClient';

interface DrawerProps {
  isOpen: boolean;
  memoryId: string | null;
  onClose: () => void;
}

export default function UniversalDrawer({ isOpen, memoryId, onClose }: DrawerProps) {
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);

  useEffect(() => {
    if (isOpen && memoryId) {
      setLoading(true);
      fetchMemory(memoryId).then(data => {
        setMemory(data);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
      
      // Removed non-existent intelligence/predictive endpoints
    } else {
      setMemory(null);
      setIntelligence(null);
      setPredictions(null);
    }
  }, [isOpen, memoryId]);

  const relatedIntelligence: any[] = [];

  const handleDelete = async () => {
    if (!memoryId) return;
    if (confirm('Are you sure you want to delete this memory?')) {
      await deleteMemory(memoryId);
      onClose();
      // Normally we would also trigger a refresh or update a store here
    }
  };

  const handleCopy = () => {
    if (memory) {
      navigator.clipboard.writeText(memory.content);
      alert('Memory copied to clipboard');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#11120D] z-40"
          />
          
          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[550px] bg-[#FFFFFF] shadow-2xl z-50 flex flex-col border-l border-[#EAEAEA]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#EAEAEA] bg-[#FFFFFF]">
              <div className="flex items-center gap-3">
                <h2 className="font-serif tracking-tight text-2xl font-medium text-[#111111]">Memory Inspector</h2>
                {memory && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#FAFAFA] text-[#666666] border border-[#EAEAEA]">
                    {memory.type}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-[#FAFAFA] text-[#A0988A] hover:text-[#111111] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center items-center h-40 text-[#A0988A]">Loading memory...</div>
              ) : memory ? (
                <div className="flex flex-col gap-10">
                  
                  {/* Summary */}
                  <section>
                    <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A0988A] mb-3">
                      <Info size={14} className="text-[#2563EB]" /> Summary
                    </h3>
                    <p className="text-[#111111] text-lg font-medium leading-relaxed">
                      {memory.content}
                    </p>
                  </section>
                  
                  {/* Evidence */}
                  <section>
                    <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A0988A] mb-3">
                      Evidence & Provenance
                    </h3>
                    <div className="bg-[#FAFAFA] p-5 rounded-[20px] border border-[#EAEAEA] text-sm text-[#666666] space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[#A0988A] font-medium">Source</span>
                        <span className="font-semibold text-[#111111] bg-[#FFFFFF] px-3 py-1 rounded-lg border border-[#EAEAEA]">{memory.source || 'Memora System'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#A0988A] font-medium">Extraction Context</span>
                        <span className="font-semibold text-[#111111] bg-[#FFFFFF] px-3 py-1 rounded-lg border border-[#EAEAEA]">Conversation Memory</span>
                      </div>
                    </div>
                  </section>

                  {/* Confidence */}
                  <section>
                    <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A0988A] mb-4">
                      <ShieldAlert size={14} className="text-[#2563EB]" /> Intelligence Scores
                    </h3>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="bg-[#FFFFFF] border border-[#EAEAEA] p-6 rounded-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#BFDBFE] transition-colors">
                        <div className="relative flex items-center justify-center mb-3">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-[#F3F4F6]" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * memory.importance)} className="text-[#10B981] transition-all duration-1000 ease-out" strokeLinecap="round" />
                          </svg>
                          <span className="absolute text-lg font-serif tracking-tight text-[#111111]">{Math.round(memory.importance * 100)}%</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#666666] uppercase tracking-widest">Importance</span>
                      </div>
                      <div className="bg-[#FFFFFF] border border-[#EAEAEA] p-6 rounded-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#BFDBFE] transition-colors">
                        <div className="relative flex items-center justify-center mb-3">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-[#F3F4F6]" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * (1 - memory.decayFactor))} className="text-[#8B5CF6] transition-all duration-1000 ease-out" strokeLinecap="round" />
                          </svg>
                          <span className="absolute text-lg font-serif tracking-tight text-[#111111]">{Math.round((1 - memory.decayFactor) * 100)}%</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#666666] uppercase tracking-widest">Retention</span>
                      </div>
                    </div>
                  </section>
                  
                  {/* Connections */}
                  <section>
                    <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A0988A] mb-3">
                      <LinkIcon size={14} className="text-[#2563EB]" /> Entity Connections
                    </h3>
                    {Array.isArray(memory.tags) && memory.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {memory.tags.map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-[#FFFFFF] border border-[#EAEAEA] text-xs font-semibold rounded-lg text-[#666666] shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-[#A0988A]">No entities extracted.</p>
                    )}
                  </section>

                  {/* Personal Intelligence */}
                  {relatedIntelligence.length > 0 && (
                    <section>
                      <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A0988A] mb-3">
                        <Sparkles size={14} className="text-[#8B5CF6]" /> Inferred Intelligence
                      </h3>
                      <div className="space-y-4">
                        {relatedIntelligence.map((item, idx) => (
                          <div key={idx} className="bg-[#FAFAFA] border border-[#EAEAEA] p-4 rounded-[20px]">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#666666] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#EAEAEA]">{item.type}</span>
                              <span className="text-[10px] font-bold text-[#A0988A] uppercase tracking-widest">{item.confidence * 100}% Conf</span>
                            </div>
                            <div className="font-semibold text-sm text-[#111111] leading-relaxed">{item.title || item.name}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Proactive Actions */}
                  {predictions && relatedIntelligence.length > 0 && (
                    <section>
                      <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#1967D2] mb-3">
                        <Sparkles size={14} className="text-[#1967D2]" /> Suggested Actions
                      </h3>
                      <div className="space-y-4">
                        {predictions.recommendations?.filter((rec: any) => 
                          relatedIntelligence.some(item => (item.title || item.name) === rec.target)
                        ).map((rec: any, idx: number) => (
                          <div key={idx} className="bg-[#EFF6FF] border border-[#BFDBFE] p-4 rounded-[20px]">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#BFDBFE]">{rec.action}</span>
                            </div>
                            <div className="font-medium text-sm text-[#111111] leading-relaxed">{rec.description}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Metadata */}
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#A0988A] mb-3">Metadata</h3>
                    <div className="space-y-3 text-sm font-medium text-[#666666]">
                      <div className="flex justify-between"><span>Created</span> <span className="text-[#111111]">{memory.timestamp}</span></div>
                      <div className="flex justify-between"><span>Last Accessed</span> <span className="text-[#111111]">{memory.accessed} times</span></div>
                      <div className="flex justify-between"><span>Memory ID</span> <span className="font-mono text-xs text-[#111111] bg-[#FAFAFA] px-2 py-0.5 rounded border border-[#EAEAEA]">{memory.id.split('-')[0]}...</span></div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="text-[#A0988A]">Memory not found.</div>
              )}
            </div>

            {/* Actions Footer */}
            {memory && (
              <div className="p-5 border-t border-[#EAEAEA] bg-[#FFFFFF] flex items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="p-2.5 text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA] rounded-xl border border-transparent hover:border-[#EAEAEA] transition-all" title="Copy">
                    <Copy size={18} />
                  </button>
                </div>
                <button onClick={handleDelete} className="px-4 py-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
