'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { Brain, User, LogOut, Menu, X, Lock } from 'lucide-react';
import AuthModal from './AuthModal';
import OnboardingModal from './OnboardingModal';
import { supabase } from '../lib/supabase';

export default function TopBar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotRegistered, setShowNotRegistered] = useState(false);

  // After login, check if user is new (no username) and what they intended
  useEffect(() => {
    if (user && !loading) {
      const meta = user.user_metadata || {};
      if (!meta.username) {
        const intent = localStorage.getItem('memora_auth_intent') || 'signup';
        localStorage.removeItem('memora_auth_intent');
        if (intent === 'signin') {
          // User clicked "Sign In" but has no account profile — show not-registered message
          setShowNotRegistered(true);
        } else {
          // User clicked "Sign Up" — show onboarding to collect their info
          setShowOnboarding(true);
        }
      }
    }
  }, [user, loading]);

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const protectedLinks = [
    { label: 'Chat', href: '/chat' },
    { label: 'Memory', href: '/memory' },
    { label: 'Graph', href: '/graph' },
    { label: 'Explore', href: '/explorer' },

  ];

  const publicLinks = [
    { label: 'Home', href: '/' },
  ];

  const allNavLinks = [
    { label: 'Home', href: '/', protected: false },
    { label: 'Chat', href: '/chat', protected: true },
    { label: 'Memory', href: '/memory', protected: true },
    { label: 'Graph', href: '/graph', protected: true },
    { label: 'Explore', href: '/explorer', protected: true },

  ];

  const handleNavClick = (e: React.MouseEvent, link: typeof allNavLinks[0]) => {
    e.preventDefault();
    if (link.protected && !user) {
      setMobileMenuOpen(false);
      setShowSignInPrompt(link.label);
    } else {
      // If we are already on Home, push the new tab to create a history entry
      // If we are on any other tab, replace the current history entry.
      // This guarantees the browser back button will ALWAYS jump to Home!
      if (window.location.pathname === '/') {
        router.push(link.href);
      } else {
        router.replace(link.href);
      }
      setMobileMenuOpen(false);
    }
  };

  const meta = user?.user_metadata || {};
  const identityData = user?.identities?.[0]?.identity_data || {};
  const avatarUrl = meta.avatar_url || meta.picture || identityData.avatar_url || identityData.picture;
  const displayName = meta.username || meta.full_name?.split(' ')[0] || identityData.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'You';

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px', backgroundColor: 'transparent'
      }}>
        {/* Logo Left */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: '#1c1917' }}>
          <img src="/logo.png" alt="Memora Logo" style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }} />
          <span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', fontFamily: 'Playfair Display, serif' }}>Memora</span>
        </Link>

        {/* Nav Center — desktop */}
        <div className="desktop-only" style={{
          alignItems: 'center', gap: '4px',
          backgroundColor: 'rgba(255,255,255,0.8)', padding: '8px 16px', borderRadius: '9999px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.03)'
        }}>
          {allNavLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link)}
              style={{
                textDecoration: 'none', color: '#1c1917', fontSize: '14px', fontWeight: 600,
                padding: '6px 14px', borderRadius: '9999px', transition: 'background 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                opacity: link.protected && !user ? 0.5 : 1,
              }}
            >
              {link.protected && !user && <Lock size={11} color="#a8a29e" />}
              {link.label}
            </a>
          ))}
        </div>

        {/* Auth Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          {!loading && (
            user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px 6px 6px',
                    borderRadius: '9999px', border: '1px solid #e7e5e4', backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" referrerPolicy="no-referrer" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.setAttribute('style', 'display: flex'); }} />
                    : null
                  }
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f0fdf4', display: avatarUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={14} color="#16a34a" />
                  </div>
                  <span className="desktop-only" style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917' }}>
                    {displayName}
                  </span>
                </button>

                {showProfileMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    backgroundColor: 'white', borderRadius: '16px', padding: '8px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #e7e5e4', minWidth: '180px', zIndex: 100
                  }}>
                    <div style={{ padding: '8px 12px 12px 12px', borderBottom: '1px solid #f5f5f4', marginBottom: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1c1917' }}>{meta.full_name || meta.name || displayName}</div>
                      {meta.username && <div style={{ fontSize: '12px', color: '#a8a29e' }}>@{meta.username}</div>}
                    </div>
                    <button
                      onClick={() => { setShowProfileMenu(false); router.push('/profile'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                        padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px',
                        color: '#1c1917', fontSize: '14px', fontWeight: 500, cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      <User size={15} /> View Profile
                    </button>
                    <button
                      onClick={() => { supabase.auth.signOut(); setShowProfileMenu(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                        padding: '10px 12px', background: 'none', border: 'none', borderRadius: '8px',
                        color: '#ef4444', fontSize: '14px', fontWeight: 500, cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="desktop-only" style={{ alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  style={{ background: 'none', border: 'none', color: '#1c1917', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Sign in
                </button>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  style={{
                    backgroundColor: '#292524', color: 'white', border: 'none', padding: '10px 22px',
                    borderRadius: '9999px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Sign up
                </button>
              </div>
            )
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'none', border: 'none', color: '#1c1917', cursor: 'pointer', padding: '8px' }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-only" style={{ padding: '16px 24px', backgroundColor: 'white', borderBottom: '1px solid #e7e5e4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {allNavLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => { handleNavClick(e, link); setMobileMenuOpen(false); }}
              style={{
                textDecoration: 'none', color: link.protected && !user ? '#a8a29e' : '#1c1917',
                fontSize: '16px', fontWeight: 600, padding: '10px 12px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {link.protected && !user && <Lock size={14} color="#a8a29e" />}
              {link.label}
            </a>
          ))}
          {!user && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e7e5e4' }}>
              <button onClick={() => { setIsAuthModalOpen(true); setMobileMenuOpen(false); }} style={{ padding: '12px', backgroundColor: '#f5f5f4', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>Sign in</button>
              <button onClick={() => { setIsAuthModalOpen(true); setMobileMenuOpen(false); }} style={{ padding: '12px', backgroundColor: '#11120D', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>Sign up</button>
            </div>
          )}
        </div>
      )}

      {/* Sign-In Prompt Overlay */}
      {showSignInPrompt && (
        <div
          onClick={() => setShowSignInPrompt(null)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 999, padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white', borderRadius: '28px', padding: '40px',
              maxWidth: '400px', width: '100%', textAlign: 'center',
              boxShadow: '0 24px 48px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#fafaf9',
              border: '1px solid #e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <Lock size={24} color="#1c1917" />
            </div>
            <h2 style={{ fontSize: '22px', fontFamily: 'Playfair Display, serif', color: '#1c1917', margin: '0 0 10px 0' }}>
              Sign In Required
            </h2>
            <p style={{ color: '#78716c', fontSize: '15px', lineHeight: 1.6, margin: '0 0 28px 0' }}>
              <strong>{showSignInPrompt}</strong> is only available to signed-in users. Create a free account to access all of Memora's features.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { setShowSignInPrompt(null); setIsAuthModalOpen(true); }}
                style={{
                  backgroundColor: '#1c1917', color: 'white', border: 'none', padding: '13px',
                  borderRadius: '9999px', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Sign In / Sign Up
              </button>
              <button
                onClick={() => setShowSignInPrompt(null)}
                style={{
                  backgroundColor: 'transparent', color: '#78716c', border: 'none',
                  padding: '10px', fontSize: '14px', cursor: 'pointer'
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Onboarding Modal — shows once for new users */}
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  );
}
