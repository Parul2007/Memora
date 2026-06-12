'use client';

import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';

interface AccessDeniedProps {
  pageName?: string;
}

export default function AccessDenied({ pageName }: AccessDeniedProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', backgroundColor: '#fdfbf7',
        padding: '24px',
      }}>
        <div style={{
          backgroundColor: 'white', borderRadius: '28px', padding: '48px 40px',
          maxWidth: '460px', width: '100%', textAlign: 'center',
          border: '1px solid #e7e5e4',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        }}>
          {/* Icon */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            backgroundColor: '#fafaf9', border: '1px solid #e7e5e4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px auto',
          }}>
            <ShieldAlert size={28} color="#a8a29e" />
          </div>

          <h2 style={{
            fontSize: '24px', fontFamily: 'Playfair Display, serif',
            color: '#1c1917', margin: '0 0 12px 0', fontWeight: 700,
          }}>
            Sign in to access {pageName || 'this page'}
          </h2>

          <p style={{
            color: '#78716c', fontSize: '15px', lineHeight: 1.7,
            margin: '0 0 32px 0',
          }}>
            This feature is only available to signed-in Memora users.
            Create a free account in seconds using Google or GitHub — no password needed.
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              style={{
                backgroundColor: '#1c1917', color: 'white', border: 'none',
                padding: '14px 24px', borderRadius: '9999px', fontSize: '15px',
                fontWeight: 600, cursor: 'pointer', width: '100%',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Sign In / Sign Up — it's free
            </button>

            <button
              onClick={() => router.replace('/')}
              style={{
                backgroundColor: 'transparent', color: '#78716c', border: '1px solid #e7e5e4',
                padding: '12px 24px', borderRadius: '9999px', fontSize: '14px',
                fontWeight: 500, cursor: 'pointer', width: '100%',
              }}
            >
              ← Go back to Home
            </button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="signup"
      />
    </>
  );
}
