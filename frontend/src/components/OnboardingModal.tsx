'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      setError('Both fields are required.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 characters: letters, numbers, underscores only.');
      return;
    }

    setSaving(true);
    setError('');
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), username: username.trim().toLowerCase() }
    });

    if (error) {
      setError(error.message);
      setSaving(false);
    } else {
      onComplete();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    border: '1px solid #e7e5e4', fontSize: '15px', fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
    backgroundColor: '#fafaf9', color: '#1c1917'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000, padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '32px', padding: '48px 40px',
        width: '100%', maxWidth: '440px',
        boxShadow: '0 32px 64px -12px rgba(0,0,0,0.25)',
      }}>
        {/* Icon */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          backgroundColor: '#fdfbf7', border: '1px solid #e7e5e4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <Sparkles size={24} color="#1c1917" />
        </div>

        <h2 style={{ fontSize: '26px', fontFamily: 'Playfair Display, serif', color: '#1c1917', margin: '0 0 8px 0' }}>
          Welcome to Memora! 🎉
        </h2>
        <p style={{ color: '#78716c', fontSize: '14px', lineHeight: 1.6, margin: '0 0 32px 0' }}>
          Before we build your vault, let us know a little about you.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#57534e', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Parul Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#57534e', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                color: '#a8a29e', fontSize: '15px', pointerEvents: 'none'
              }}>@</span>
              <input
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                style={{ ...inputStyle, paddingLeft: '32px' }}
              />
            </div>
            <p style={{ fontSize: '12px', color: '#a8a29e', margin: '4px 0 0 0' }}>
              3-20 characters. Letters, numbers, underscores.
            </p>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '13px', padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '10px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: '8px', backgroundColor: '#1c1917', color: 'white', border: 'none',
              padding: '14px', borderRadius: '9999px', fontSize: '15px', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {saving ? 'Saving…' : 'Enter My Vault →'}
          </button>
        </form>
      </div>
    </div>
  );
}
