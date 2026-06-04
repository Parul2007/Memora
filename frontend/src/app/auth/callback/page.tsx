'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/AuthContext';

/**
 * The OAuth callback page.
 * Supabase automatically handles the PKCE code exchange via onAuthStateChange.
 * We just need to wait for the session to appear, then redirect.
 */
export default function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        const isOAuth = sessionStorage.getItem('oauth_in_progress');
        if (isOAuth) {
          sessionStorage.removeItem('oauth_in_progress');
          router.replace('/memory');
        } else {
          // If oauth_in_progress is false, the user hit the Back button to return here.
          // Send them to Home to break the redirect trap.
          router.replace('/');
        }
      } else {
        // Wait a bit longer for Supabase to process the token from the URL
        const timer = setTimeout(() => {
          router.replace('/');
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', backgroundColor: '#fdfbf7',
      gap: '16px'
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%',
        border: '3px solid #e7e5e4', borderTopColor: '#1c1917',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#78716c', fontSize: '15px', fontFamily: 'Inter, sans-serif' }}>
        Signing you in…
      </p>
    </div>
  );
}
