import React from 'react';
import { Network, Box, Route, Users } from 'lucide-react';
import type { GraphViewType } from './GraphLayout';

interface NavProps {
  activeView: GraphViewType;
  onViewChange: (v: GraphViewType) => void;
}

export default function GraphNavigation({ activeView, onViewChange }: NavProps) {
  
  const graphNavItems = [
    { id: 'graph_home', label: 'Knowledge Graph', icon: Network },
  ] as const;

  return (
    <nav className="responsive-sidebar pt-6 px-4 bg-white overflow-y-auto">
      <div className="mb-8 px-2">
        <h2 className="font-serif text-xl font-semibold text-[#11120D]">Graph</h2>
        <p className="text-xs text-[#A0988A] mt-1">Knowledge Architecture</p>
      </div>

      <div className="flex flex-col gap-1">

        {graphNavItems.map((item) => {
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
