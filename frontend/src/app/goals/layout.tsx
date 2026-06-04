import React from 'react';
import GoalsSidebar from '../../components/goals/GoalsSidebar';

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="responsive-sidebar-layout">
      <GoalsSidebar />
      <div style={{ flex: 1, backgroundColor: '#FAFAF9', overflowY: 'auto', minWidth: 0 }}>
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', paddingBottom: '80px', boxSizing: 'border-box' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
