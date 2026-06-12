'use client';

import React, { useState } from 'react';
import ErrorBoundary from '../common/ErrorBoundary';
import EntityDetailView from '../graph/EntityDetailView';
import MemoryView from '../graph/MemoryView';

// Views
import EntityExplorerView from '../graph/EntityExplorerView';

export default function ExplorerLayout() {
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
    <div className="flex min-h-0 h-full w-full overflow-hidden bg-[#FAFAFA] text-[#111111] font-sans relative">
      
      {/* Center Content */}
      <main className={`flex-1 min-h-0 flex flex-col relative overflow-hidden border-r border-[#EAEAEA] transition-all duration-300 ${isEntityProfileOpen ? 'mr-0 sm:mr-[480px]' : ''}`}>
        <ErrorBoundary fallbackMessage="Failed to load this view.">
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            <EntityExplorerView onOpenEntity={openEntityProfile} />
          </div>
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
