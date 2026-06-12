'use client';

import React from 'react';
import { useAuth } from '../../lib/AuthContext';

export default function GraphLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  
  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return <>{children}</>;
}
