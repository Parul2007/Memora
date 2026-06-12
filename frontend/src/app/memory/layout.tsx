'use client';

import React from 'react';
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
    <div className="flex h-full w-full overflow-hidden bg-[#FAFAF9]">
      {children}
    </div>
  );
}
