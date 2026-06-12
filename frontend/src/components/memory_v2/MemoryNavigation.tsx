import React from 'react';
import { LayoutDashboard, Clock, BookOpen, Database, Search } from 'lucide-react';
import type { ViewType } from './MemoryLayout';

interface NavProps {
  activeView: ViewType;
  onViewChange: (v: ViewType) => void;
}

export default function MemoryNavigation({ activeView, onViewChange }: NavProps) {
  
  const coreNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'learning', label: 'Learning Patterns', icon: BookOpen },
    { id: 'explorer', label: 'Fact Explorer', icon: Database },
  ] as const;

  return (
    <nav className="responsive-sidebar pt-6 px-4 bg-white overflow-y-auto">
      <div className="mb-8 px-2">
        <h2 className="text-2xl font-serif tracking-tight text-[#111111]">Intelligence</h2>
        <p className="text-xs text-[#A0988A] mt-1 font-medium">Memory Operating System</p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-[#A0988A] uppercase tracking-wider mb-2 mt-4 px-3">Memory</div>
        {coreNavItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                ${isActive 
                  ? 'bg-[#F0EFEA] text-[#11120D] font-medium' 
                  : 'text-[#565449] hover:bg-[#FAFAF9] hover:text-[#11120D]'
                }`}
            >
              <Icon size={18} className={isActive ? 'text-[#11120D]' : 'text-[#A0988A]'} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
