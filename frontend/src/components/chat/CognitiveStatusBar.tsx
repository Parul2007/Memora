import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BrainCircuit, PenTool } from 'lucide-react';
import { StreamState } from '../../types';

interface CognitiveStatusBarProps {
  state: StreamState;
}

const PHRASES = [
  "Dusting off old memories...",
  "Consulting the neural network...",
  "Connecting the dots...",
  "Gearing up the AI engines...",
  "Synthesizing thoughts...",
  "Almost there..."
];

export default function CognitiveStatusBar({ state }: CognitiveStatusBarProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (state === StreamState.RETRIEVING || state === StreamState.THINKING) {
      const interval = setInterval(() => {
        setPhraseIndex(prev => (prev + 1) % PHRASES.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [state]);

  if (state === StreamState.IDLE || state === StreamState.COMPLETE || state === StreamState.ERROR) {
    return null;
  }

  const isWriting = state === StreamState.GENERATING;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 p-2.5 px-4 rounded-full bg-[#1A1A1A] border border-[#333] mb-4 w-max shadow-lg"
    >
      {isWriting ? (
        <div className="flex items-center gap-2 text-[#E8E8E8] text-xs font-medium">
          <PenTool size={14} className="animate-bounce text-green-400" />
          <span>Writing response...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[#E8E8E8] text-xs font-medium min-w-[200px]">
          <BrainCircuit size={16} className="animate-pulse text-purple-400" />
          <div className="relative h-[18px] w-full overflow-hidden flex items-center">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={phraseIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute"
              >
                {PHRASES[phraseIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
