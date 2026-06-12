'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorBoundary from '../common/ErrorBoundary';

import EntityDetailView from './EntityDetailView';
import MemoryView from './MemoryView';

// Views
import GraphHomeView from './GraphHomeView';
export type GraphViewType = 'graph_home';

export default function GraphLayout() {
  const [activeView, setActiveView] = useState<GraphViewType>('graph_home');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isEntityProfileOpen, setIsEntityProfileOpen] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);

  const openEntityProfile = (id: string) => {
    setSelectedEntityId(id);
    setIsEntityProfileOpen(true);
  };

  const closeEntityProfile = () => {
    setIsEntityProfileOpen(false);
    setTimeout(() => setSelectedEntityId(null), 300);
  };

  const openMemory = (id: string) => {
    setSelectedMemoryId(id);
    setIsMemoryOpen(true);
  };

  const closeMemory = () => {
    setIsMemoryOpen(false);
    setTimeout(() => setSelectedMemoryId(null), 300);
  };

  return (
    <div className="flex min-h-0 h-full w-full overflow-hidden bg-[#FAFAF9] text-[#11120D] font-sans relative">
      
      {/* Center Content */}
      <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden border-r border-[#e7e5e4]">
        <ErrorBoundary fallbackMessage="Failed to load this view.">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 flex flex-col overflow-y-auto"
            >
              {activeView === 'graph_home' && <GraphHomeView onOpenEntity={openEntityProfile} />}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* Entity Profile Drawer overlay */}
      <EntityDetailView
        isOpen={isEntityProfileOpen}
        entityName={selectedEntityId}
        onClose={closeEntityProfile}
        onOpenMemory={openMemory}
        onOpenEntity={openEntityProfile}
      />

      {/* Memory View Overlay */}
      <MemoryView
        memoryId={selectedMemoryId}
        isOpen={isMemoryOpen}
        onClose={closeMemory}
      />
      
    </div>
  );
}
