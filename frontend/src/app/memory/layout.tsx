'use client';

import React from 'react';
import MemorySidebar from '../../components/memory/MemorySidebar';
import { useAuth } from '../../lib/AuthContext';
import { useProtectedRoute } from '../../lib/useProtectedRoute';
import AccessDenied from '../../components/AccessDenied';

export default function MemoryLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const { isReady } = useProtectedRoute();
  
  // We lift the state up here to share the active view/filter with the Sidebar and MainArea,
  // but for a true Next.js app we might use URL search params (e.g. ?view=fading).
  // For this prototype, we'll use a simple state context or pass props if possible.
  // Actually, to avoid prop drilling without context, we will rely on URL params or a simple shared state.
  // We'll create a lightweight context.

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#78716c' }}>Loading…</div>;
  }

  if (!isReady) return <AccessDenied pageName="Memory Vault" />;

  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 84px)', // Adjusting for TopBar
      overflow: 'hidden',
      backgroundColor: '#FAFAF9'
    }}>
      {/* Persistent Left Sidebar */}
      <MemorySidebar />

      {/* Dynamic Main Content (Grid, List, Timeline, or Detail) */}
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
