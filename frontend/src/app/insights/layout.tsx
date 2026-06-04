import React from 'react';
import InsightsSidebar from '../../components/insights/InsightsSidebar';

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="responsive-sidebar-layout">
      <InsightsSidebar />
      <div style={{ flex: 1, backgroundColor: '#FAFAF9', overflowY: 'auto', minWidth: 0 }}>
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px', boxSizing: 'border-box' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
