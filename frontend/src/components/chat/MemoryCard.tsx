import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Clock, RefreshCw, ChevronDown, Pin, Tag } from 'lucide-react';
import { MemoryItem } from '../../types';
import { apiFetch } from '../../services/apiClient';

interface MemoryCardProps {
  memory: MemoryItem;
  status: 'used' | 'retrieved' | 'saved';
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, newContent: string) => void;
}

const TYPE_COLORS: Record<string, { bg: string, text: string }> = {
  episodic: { bg: '#e0f2fe', text: '#0284c7' },
  semantic: { bg: '#fef08a', text: '#a16207' },
  emotional: { bg: '#fce7f3', text: '#be185d' },
  procedural: { bg: '#dcfce7', text: '#15803d' }
};

export default function MemoryCard({ memory, status, onDelete, onUpdate }: MemoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memory.content);
  const [isPinned, setIsPinned] = useState(memory.metadata?.pinned || false);
  
  const mType = (memory as any).memory_type?.toLowerCase() || memory.type?.toLowerCase() || 'semantic';
  const colors = TYPE_COLORS[mType] || TYPE_COLORS.semantic;
  const relScore = memory.relevance !== undefined ? (memory.relevance <= 1 ? memory.relevance * 100 : memory.relevance) : 0;
  
  const age = Math.floor((Date.now() - new Date((memory as any).created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
  const ageText = age <= 0 ? 'Today' : `${age}d ago`;

  // Extracted entities
  const entitiesList = useMemo(() => {
    if (Array.isArray(memory.metadata?.entities)) return memory.metadata.entities;
    if (Array.isArray((memory as any).entities)) return (memory as any).entities;
    return [];
  }, [memory.metadata, (memory as any).entities]);

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    try {
      const currentMeta = memory.metadata || {};
      await apiFetch(`/api/memory/${memory.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          metadata: {
            ...currentMeta,
            pinned: nextPinned
          }
        })
      });
      if (onUpdate) {
        onUpdate(memory.id, memory.content);
      }
    } catch (err) {
      console.error("Failed to pin/unpin memory:", err);
      setIsPinned(!nextPinned);
    }
  };

  return (
    <motion.div 
      layout
      className="bg-white border border-[#e7e5e4] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Top: Memory Content */}
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-[13px] text-[#11120D] bg-[#FAFAF9] border border-[#e7e5e4] rounded p-2 focus:outline-none focus:border-[#A0988A] mb-3"
          rows={3}
        />
      ) : (
        <p className={`text-[14px] text-[#11120D] leading-relaxed break-words font-medium mb-4 ${!isExpanded ? 'line-clamp-2' : ''}`}>
          {memory.content}
        </p>
      )}

      {/* Bottom: Progress Bar & Match Percentage */}
      <div className="flex items-center justify-between w-full gap-4 mt-auto">
        <div className="flex-1 h-[4px] bg-[#f5f5f4] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, relScore))}%`, backgroundColor: '#a8a29e' }} />
        </div>
        <span className="text-[11px] font-semibold text-[#a8a29e] whitespace-nowrap">
          {relScore.toFixed(0)}% match
        </span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[#f5f5f4] grid grid-cols-2 gap-2 text-[10px] text-[#78716c]">
              <div className="flex items-center gap-1">
                <BrainCircuit size={12} />
                <span>Source: {memory.source || 'Memora'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>Age: {ageText}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              {isEditing ? (
                <>
                  <button onClick={() => { setIsEditing(false); setEditContent(memory.content); }} className="px-3 py-1.5 text-[11px] font-semibold text-[#78716c] hover:bg-[#f5f5f4] rounded transition-colors">Cancel</button>
                  <button onClick={() => { setIsEditing(false); onUpdate?.(memory.id, editContent); }} className="px-3 py-1.5 text-[11px] font-semibold text-white bg-[#11120D] rounded transition-colors">Save</button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-[11px] font-semibold text-[#78716c] hover:bg-[#f5f5f4] rounded transition-colors">Edit</button>
                  <button onClick={() => { if(confirm('Delete memory?')) onDelete?.(memory.id); }} className="px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded transition-colors">Delete</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
