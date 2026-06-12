'use client';

import React, { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import ErrorBoundary from '../common/ErrorBoundary';
import MemoryNavigation from './MemoryNavigation';
import UniversalDrawer from './UniversalDrawer';
import EntityDetailView from '../graph/EntityDetailView';

// Views
import DashboardView from './views/DashboardView';
import TimelineView from './views/TimelineView';
import LearningView from './views/LearningView';
import FactExplorerView from './views/FactExplorerView';

export type ViewType = 'dashboard' | 'timeline' | 'learning' | 'explorer';

export default function MemoryLayout() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isEntityProfileOpen, setIsEntityProfileOpen] = useState(false);

  const openDrawer = (id: string) => {
    setSelectedMemoryId(id);
    setIsDrawerOpen(true);
  };

  const openEntityProfile = (id: string) => {
    setSelectedEntityId(id);
    setIsEntityProfileOpen(true);
  };

  const closeEntityProfile = () => {
    setIsEntityProfileOpen(false);
    setTimeout(() => setSelectedEntityId(null), 300);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedMemoryId(null), 300); // clear after animation
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#FAFAF9] text-[#11120D] font-sans">
      
      {/* Left Navigation */}
      <MemoryNavigation activeView={activeView} onViewChange={setActiveView} />

      {/* Center Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden border-r border-[#e7e5e4]">
        <ErrorBoundary fallbackMessage="Failed to load this view. This could be due to a network interruption or temporary unavailability.">
          <AnimatePresence mode="wait">
            <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto"
          >
            {activeView === 'dashboard' && <DashboardView onOpenMemory={openDrawer} onNavigate={setActiveView} />}
            {activeView === 'timeline' && <TimelineView onOpenMemory={openDrawer} />}
            {activeView === 'learning' && <LearningView onOpenMemory={openDrawer} />}
            {activeView === 'explorer' && <FactExplorerView onOpenMemory={openDrawer} />}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* Right Context Panel removed as requested */}

      {/* Universal Detail Drawer */}
      <ErrorBoundary fallbackMessage="Drawer failed to render.">
        <UniversalDrawer 
          isOpen={isDrawerOpen} 
          memoryId={selectedMemoryId} 
          onClose={closeDrawer} 
        />
      </ErrorBoundary>

      {/* Entity Profile Overlay */}
      <EntityDetailView
        isOpen={isEntityProfileOpen}
        entityName={selectedEntityId}
        onClose={closeEntityProfile}
        onOpenMemory={openDrawer}
        onOpenEntity={openEntityProfile}
      />
      
    </div>
  );
}
