'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: AuthMode;
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'signup' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError('');
    // Store the user's intent so the callback page knows what to do
    localStorage.setItem('memora_auth_intent', mode);
    sessionStorage.setItem('oauth_in_progress', 'true');

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const isSignUp = mode === 'signup';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff', borderRadius: '32px', padding: '40px',
          width: '100%', maxWidth: '420px',
          boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(0,0,0,0.05)', position: 'relative',
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e' }}>
          <X size={20} />
        </button>

        {/* Mode toggle tabs */}
        <div style={{ display: 'flex', backgroundColor: '#f5f5f4', borderRadius: '12px', padding: '4px', marginBottom: '28px' }}>
          <button
            onClick={() => { setMode('signin'); setError(''); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
              backgroundColor: mode === 'signin' ? 'white' : 'transparent',
              color: mode === 'signin' ? '#1c1917' : '#78716c',
              boxShadow: mode === 'signin' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
              backgroundColor: mode === 'signup' ? 'white' : 'transparent',
              color: mode === 'signup' ? '#1c1917' : '#78716c',
              boxShadow: mode === 'signup' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Sign Up
          </button>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1c1917', marginBottom: '6px', marginTop: 0, fontFamily: 'Playfair Display, serif' }}>
          {isSignUp ? 'Create your Vault' : 'Welcome back'}
        </h2>
        <p style={{ color: '#78716c', fontSize: '14px', marginBottom: '28px', lineHeight: 1.5, marginTop: 0 }}>
          {isSignUp
            ? 'Connect with Google or GitHub to build your personal AI memory vault.'
            : 'Sign in to your existing Memora account.'}
        </p>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '10px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Google */}
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            style={{
              backgroundColor: '#ffffff', color: '#1c1917', padding: '14px 20px',
              borderRadius: '9999px', border: '1px solid #e7e5e4', fontSize: '15px',
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
          </button>

          {/* GitHub */}
          <button
            onClick={() => handleOAuthLogin('github')}
            disabled={loading}
            style={{
              backgroundColor: '#1c1917', color: 'white', padding: '14px 20px',
              borderRadius: '9999px', border: 'none', fontSize: '15px',
              fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            {isSignUp ? 'Sign up with GitHub' : 'Sign in with GitHub'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#a8a29e' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => { setMode(isSignUp ? 'signin' : 'signup'); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#1c1917', fontWeight: 600, cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Sign in' : 'Sign up free'}
          </button>
        </p>
      </div>
    </div>
  );
}
