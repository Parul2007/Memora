import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, BrainCircuit } from 'lucide-react';

interface ThinkingPanelProps {
  phase?: string;
  duration?: number;
  memoriesUsed?: number;
}

export default function ThinkingPanel({ phase, duration, memoriesUsed }: ThinkingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!phase && !duration && !memoriesUsed) return null;

  return (
    <div className="mb-3">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-[#888] hover:text-[#CCC] transition-colors py-1 px-2 rounded hover:bg-[#333]/30"
      >
        <BrainCircuit size={14} className={!duration ? "text-purple-400 animate-pulse" : "text-[#666]"} />
        <span>
          {!duration ? `Thinking: ${phase || 'processing'}...` : `Thought process (${duration}ms)`}
        </span>
        {memoriesUsed !== undefined && memoriesUsed > 0 && (
          <span className="text-[#555] mx-1">• {memoriesUsed} memories</span>
        )}
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-1 ml-2"
          >
            <div className="pl-3 border-l-2 border-[#333] text-xs text-[#888] py-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Retrieving relevant episodic and semantic memories
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Constructing context window
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Applying chain-of-thought reasoning
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                {phase || 'Synthesizing response'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
