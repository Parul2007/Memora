'use client';
import React from 'react';
import GraphMainArea from '../../components/graph/GraphMainArea';
import { useProtectedRoute } from '../../lib/useProtectedRoute';
import AccessDenied from '../../components/AccessDenied';

export default function GraphPage() {
  const { isReady, loading } = useProtectedRoute();
  
  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#78716c' }}>Loading...</div>;
  if (!isReady) return <AccessDenied pageName="Knowledge Graph" />;
  
  return <GraphMainArea />;
}
