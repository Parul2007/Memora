'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useProtectedRoute } from '../../lib/useProtectedRoute';
import { supabase } from '../../lib/supabase';
import { User, Mail, LogOut, Edit3, Check, X } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { isReady } = useProtectedRoute();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isReady || !user) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  const meta = user.user_metadata || {};
  const displayName = meta.full_name || meta.name || user.email?.split('@')[0] || 'Memora User';
  const displayUsername = meta.username ? `@${meta.username}` : null;
  const avatarUrl = meta.avatar_url || meta.picture || null;
  const provider = user.app_metadata?.provider || 'email';

  const startEdit = () => {
    setFullName(meta.full_name || meta.name || '');
    setUsername(meta.username || '');
    setSaveError('');
    setSaveSuccess(false);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    if (!fullName.trim() || !username.trim()) { setSaveError('Both fields are required.'); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setSaveError('Username: 3-20 chars, letters/numbers/underscores only.'); return; }
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim(), username: username.trim().toLowerCase() } });
    setSaving(false);
    if (error) { setSaveError(error.message); }
    else { setSaveSuccess(true); setEditing(false); setTimeout(() => setSaveSuccess(false), 3000); }
  };

  const providerLabel: Record<string, string> = { google: 'Google', github: 'GitHub', email: 'Email' };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <h1 style={{ fontSize: '32px', fontFamily: 'Playfair Display, serif', color: '#1c1917', margin: '0 0 8px 0' }}>My Profile</h1>
      <p style={{ color: '#78716c', fontSize: '15px', margin: '0 0 40px 0' }}>Manage your personal information and account settings.</p>

      {/* Avatar + Name Card */}
      <div style={{
        backgroundColor: 'white', borderRadius: '24px', padding: '32px',
        border: '1px solid #e7e5e4', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: '0 0 4px 0' }}>{displayName}</h2>
            {displayUsername && <p style={{ color: '#78716c', fontSize: '15px', margin: '0 0 4px 0' }}>{displayUsername}</p>}
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: '9999px',
              backgroundColor: '#f5f5f4', color: '#57534e', fontSize: '12px', fontWeight: 600
            }}>
              {providerLabel[provider] || provider}
            </span>
          </div>
        </div>

        {/* Info rows */}
        {!editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <InfoRow icon={<User size={16} />} label="Full Name" value={meta.full_name || meta.name || '—'} />
            <InfoRow icon={<span style={{ fontSize: '15px', color: '#a8a29e' }}>@</span>} label="Username" value={meta.username || '—'} />
            <InfoRow icon={<Mail size={16} />} label="Email" value={user.email || '—'} />

            <div style={{ borderTop: '1px solid #f5f5f4', paddingTop: '16px', marginTop: '4px', display: 'flex', gap: '12px' }}>
              <button onClick={startEdit} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                backgroundColor: '#1c1917', color: 'white', border: 'none', borderRadius: '9999px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer'
              }}>
                <Edit3 size={14} /> Edit Profile
              </button>
              <button onClick={() => supabase.auth.signOut()} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                backgroundColor: 'white', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '9999px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer'
              }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>

            {saveSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontSize: '14px' }}>
                <Check size={16} /> Profile updated successfully!
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#57534e', marginBottom: '6px' }}>Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} placeholder="Your full name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#57534e', marginBottom: '6px' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#a8a29e', fontSize: '15px' }}>@</span>
                <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  style={{ ...inputStyle, paddingLeft: '30px' }} placeholder="your_username" />
              </div>
            </div>
            {saveError && <div style={{ color: '#ef4444', fontSize: '13px', padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '10px' }}>{saveError}</div>}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={saveProfile} disabled={saving} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                backgroundColor: '#1c1917', color: 'white', border: 'none', borderRadius: '9999px',
                fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
              }}>
                <Check size={14} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={cancelEdit} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                backgroundColor: 'white', color: '#57534e', border: '1px solid #e7e5e4', borderRadius: '9999px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer'
              }}>
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e7e5e4',
  fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
  backgroundColor: 'white', color: '#1c1917'
};

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ color: '#a8a29e', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '14px', color: '#1c1917', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
      </div>
    </div>
  );
}
