import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Network, Clock, Database, TrendingUp, Link as LinkIcon, AlertCircle, Target, Activity } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import useSWR from 'swr';

interface EntityProfile {
  entity: { name: string; label: string };
  stats: { mentions: number; relationships: number; updated_at: string };
  related_entities: Array<{ text: string; label: string; strength: number }>;
  memory_references: Array<{ id: string; type: string; importance: number; created_at: string }>;
  timeline: Array<{ id: string; type: string; importance: number; created_at: string }>;
}

export default function EntityDetailView({ 
  entityName, 
  isOpen, 
  onClose,
  onOpenMemory,
  onOpenEntity
}: { 
  entityName: string | null; 
  isOpen: boolean; 
  onClose: () => void;
  onOpenMemory: (id: string) => void;
  onOpenEntity: (id: string) => void;
}) {
  const fetcher = (url: string) => apiFetch<any>(url);
  const { data: intel } = useSWR<any>('/api/intelligence/overview', fetcher);
  const profileKey = isOpen && entityName ? `/api/graph/entity/${encodeURIComponent(entityName)}` : null;
  const { data: profile, isLoading: loading } = useSWR<EntityProfile>(profileKey, fetcher);

  const getRelatedIntelligence = () => {
    if (!intel || !profile) return [];
    const related: any[] = [];
    
    // Gather matching terms
    const matchStrings = [profile.entity.name.toLowerCase()];
    profile.related_entities.forEach(r => matchStrings.push(r.text.toLowerCase()));
    const memoryIds = profile.memory_references.map(m => m.id);

    const checkItems = (items: any[], type: string) => {
      items?.forEach(item => {
        let isMatch = false;
        
        // 1. Check title/name
        const itemTitle = (item.title || item.name || '').toLowerCase();
        if (matchStrings.some(s => itemTitle.includes(s))) isMatch = true;

        // 2. Check evidence/topics
        if (!isMatch && item.evidence) {
           if (item.evidence.some((ev: string) => matchStrings.some(s => ev.toLowerCase().includes(s)))) isMatch = true;
        }
        if (!isMatch && item.related_topics) {
           if (item.related_topics.some((t: string) => matchStrings.some(s => t.toLowerCase().includes(s)))) isMatch = true;
        }

        // 3. Check supporting memories
        if (!isMatch && item.supporting_memories) {
           if (item.supporting_memories.some((mId: string) => memoryIds.includes(mId))) isMatch = true;
        }

        if (isMatch) {
          related.push({ ...item, type });
        }
      });
    };

    checkItems(intel.concepts, 'Concept');
    
    return related;
  };

  const relatedIntelligence = getRelatedIntelligence();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] z-30 bg-[#FAFAF9] border-l border-[#e7e5e4] shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-[#e7e5e4] px-6 py-5 flex justify-between items-start gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F0EFEA] text-[#565449] flex items-center justify-center hover:bg-[#e7e5e4] transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <h1 className="text-xl font-serif font-bold text-[#11120D] truncate max-w-[200px]" title={entityName || ''}>{entityName}</h1>
                  {profile && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#11120D] text-white rounded tracking-wider uppercase">
                      {profile.entity.label}
                    </span>
                  )}
                </div>
                <p className="text-[#78716c] text-[11px]">Entity Intelligence Profile</p>
              </div>
            </div>
            
            {profile && (
              <div className="flex gap-3 text-right flex-shrink-0">
                <div>
                  <div className="text-[9px] font-semibold text-[#A0988A] uppercase tracking-wider">Mentions</div>
                  <div className="text-sm font-bold text-[#11120D]">{profile.stats.mentions}</div>
                </div>
                <div className="w-px h-6 bg-[#e7e5e4] self-center"></div>
                <div>
                  <div className="text-[9px] font-semibold text-[#A0988A] uppercase tracking-wider">Links</div>
                  <div className="text-sm font-bold text-[#11120D]">{profile.stats.relationships}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="animate-pulse space-y-6">
                <div className="h-24 bg-[#F0EFEA] rounded-xl"></div>
                <div className="h-32 bg-[#F0EFEA] rounded-xl"></div>
                <div className="h-40 bg-[#F0EFEA] rounded-xl"></div>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                
                {/* Insights Summary */}
                <div className="bg-gradient-to-br from-[#11120D] to-[#2A2B24] rounded-xl p-4 text-white shadow-sm flex items-start gap-3">
                  <TrendingUp className="text-blue-400 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Entity Summary</h3>
                    <p className="text-[#E8E6E1] text-xs leading-relaxed">
                      "{profile.entity.name}" is a {profile.entity.label.toLowerCase()} frequently discussed within Memora. 
                      It has been mentioned {profile.stats.mentions} times across your memory vault and is connected to {profile.stats.relationships} other distinct concepts.
                    </p>
                  </div>
                </div>

                {/* Related Entities Map */}
                <div className="space-y-2">
                  <h3 className="font-serif text-sm font-semibold text-[#11120D] flex items-center gap-2">
                    <Network size={16} className="text-[#A0988A]"/> Connected Concepts ({profile.related_entities.length})
                  </h3>
                  <div className="bg-white border border-[#e7e5e4] rounded-xl p-3 flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
                    {profile.related_entities.length > 0 ? profile.related_entities.map((rel, i) => (
                      <div 
                        key={i} 
                        onClick={() => onOpenEntity(rel.text)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#FAFAF9] cursor-pointer transition-colors group"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-xs text-[#11120D] group-hover:text-blue-600 transition-colors truncate">{rel.text}</span>
                          <span className="text-[10px] text-[#A0988A] capitalize">{rel.label}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-mono">
                            Strength: {rel.strength}
                          </span>
                          <LinkIcon size={12} className="text-[#A0988A] group-hover:text-blue-600" />
                        </div>
                      </div>
                    )) : (
                      <p className="text-[#A0988A] text-xs italic p-2">No connected concepts found.</p>
                    )}
                  </div>
                </div>

                {/* Timeline & Memories */}
                <div className="space-y-2">
                  <h3 className="font-serif text-sm font-semibold text-[#11120D] flex items-center gap-2">
                    <Clock size={16} className="text-[#A0988A]"/> Memory References ({profile.memory_references.length})
                  </h3>
                  <div className="space-y-2">
                    {profile.memory_references.slice(0, 8).map((mem) => (
                      <div 
                        key={mem.id} 
                        onClick={() => onOpenMemory(mem.id)}
                        className="bg-white border border-[#e7e5e4] rounded-xl p-3.5 hover:border-[#11120D] hover:shadow-sm cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${mem.type === 'episodic' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                          <span className="font-mono text-xs text-[#78716c] group-hover:text-[#11120D] transition-colors truncate">
                            {new Date(mem.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#F0EFEA] text-[#565449] rounded uppercase tracking-wider">{mem.type}</span>
                          <div className="w-6 h-6 rounded-full bg-[#FAFAF9] text-[#11120D] flex items-center justify-center font-bold text-[10px] group-hover:bg-[#11120D] group-hover:text-white transition-colors">
                            {Math.round(mem.importance * 10)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {profile.memory_references.length === 0 && (
                      <div className="p-6 border border-dashed border-[#e7e5e4] rounded-xl text-center text-[#A0988A] text-xs">
                        No memory references found.
                      </div>
                    )}
                  </div>
                </div>

                {/* Connected Intelligence Sections */}
                {relatedIntelligence.length > 0 && (
                  <div className="pt-4 border-t border-[#e7e5e4] space-y-4">
                    <h3 className="font-serif text-sm font-semibold text-[#11120D] flex items-center gap-2">
                      <Target size={16} className="text-[#1967D2]" /> Connected Intelligence
                    </h3>
                    
                    <div className="space-y-4">
                      {['Concept'].map(type => {
                        const items = relatedIntelligence.filter(item => item.type === type);
                        if (items.length === 0) return null;
                        
                        return (
                          <div key={type} className="bg-white border border-[#e7e5e4] rounded-xl p-4 shadow-sm space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#A0988A]">
                              Connected {type}s
                            </h4>
                            <div className="space-y-3">
                              {items.map((item, idx) => (
                                <div key={idx} className="border-b border-[#F0EFEA] last:border-0 pb-3 last:pb-0">
                                  <div className="flex justify-between items-start gap-2 mb-1.5">
                                    <h5 className="font-semibold text-[#11120D] text-sm truncate">{item.title || item.name}</h5>
                                    {item.confidence && (
                                      <span className="text-[8px] uppercase font-bold tracking-wider px-1 py-0.5 bg-[#E8F0FE] text-[#1967D2] rounded flex-shrink-0">
                                        Conf: {Math.round(item.confidence * 100)}%
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[10px] text-[#565449]">
                                    {item.evidence && (
                                      <div className="flex items-center gap-1">
                                        <Database size={10} /> {item.evidence.length} Evidence
                                      </div>
                                    )}
                                    {(item.status || item.momentum || item.activity_level) && (
                                      <div className="flex items-center gap-1">
                                        <Activity size={10} /> Status: {item.status || item.momentum || item.activity_level}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#A0988A] py-12">
                <AlertCircle size={36} className="mb-3 opacity-20" />
                <p className="text-xs">Entity profile could not be loaded.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
