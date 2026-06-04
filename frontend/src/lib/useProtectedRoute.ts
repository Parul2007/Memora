'use client';

import { useAuth } from './AuthContext';

/**
 * Returns the current auth state.
 * Consuming pages should render <AccessDenied /> when isReady is false and loading is done.
 * No automatic redirect — users see a friendly message instead.
 *
 * When NEXT_PUBLIC_API_URL is localhost (dev mode), the backend accepts
 * unauthenticated requests, so we allow access even without a Supabase session.
 */
export function useProtectedRoute() {
  const { user, loading } = useAuth();
  const isDev = typeof window !== 'undefined'
    && (process.env.NEXT_PUBLIC_API_URL || '').includes('localhost');
  const isReady = !loading && (!!user || isDev);
  return { isReady, loading };
}
