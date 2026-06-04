'use client';

import React from 'react';
import GraphSidebar from '../../components/graph/GraphSidebar';
import { useAuth } from '../../lib/AuthContext';

export default function GraphLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  
  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 84px)', // Adjusting for TopBar
      overflow: 'hidden',
      backgroundColor: '#FAFAF9'
    }}>
      {/* Persistent Left Sidebar */}
      <GraphSidebar />

      {/* Dynamic Main Content (Graph or Table) */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: 'white',
        borderTopLeftRadius: '24px',
        border: '1px solid #e7e5e4',
        margin: '16px 16px 16px 0',
        boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {children}
      </main>
    </div>
  );
}
