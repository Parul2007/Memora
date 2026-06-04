'use client';
import React, { useEffect, useState } from 'react';
import ExtensionStatusBanner from '../../components/extension/ExtensionStatusBanner';
import PlatformCard from '../../components/extension/PlatformCard';
import ActivityLogEntry from '../../components/extension/ActivityLogEntry';
import ActivityCalendar from '../../components/extension/ActivityCalendar';
import PrivacyControlPanel from '../../components/extension/PrivacyControlPanel';
import AddExtensionFlow from '../../components/extension/AddExtensionFlow';
import { apiFetch } from '../../services/apiClient';
import { useProtectedRoute } from '../../lib/useProtectedRoute';
import AccessDenied from '../../components/AccessDenied';

export default function ExtensionHubPage() {
  const { isReady } = useProtectedRoute();
  const [status, setStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [view, setView] = useState<'log' | 'timeline'>('timeline');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<any>('/api/extension/status')
      .then((res) => {
        setStatus({
          installed: res.installed,
          version: res.version,
          lastSync: res.last_sync,
          globalPause: res.global_pause,
        });
        setStats({
          totalIngested: res.total_ingested,
          conversationsProcessed: res.conversations_processed,
          duplicatesSkipped: res.duplicates_skipped,
          platforms: res.platforms,
        });
        setActivity(res.activity || []);
      })
      .catch((err) => {
        // Fallback to mock data to show the layout since the backend route isn't built yet
        setStatus({ installed: true, version: '1.2.0', lastSync: new Date().toISOString(), globalPause: false });
        setStats({
          totalIngested: 1420,
          conversationsProcessed: 89,
          duplicatesSkipped: 312,
          platforms: {
            chatgpt: { syncStatus: 'active', lastSyncTime: '5 mins ago', error: null },
            claude: { syncStatus: 'active', lastSyncTime: '2 hours ago', error: null },
            gemini: { syncStatus: 'paused', lastSyncTime: '2 days ago', error: 'Authentication expired' }
          }
        });
        setActivity([
          { id: '1', platform: 'chatgpt', timestamp: new Date().toISOString(), type: 'auto-capture', title: 'React Hooks Discussion', memories: ['useRef hook', 'useEffect dependencies'], entities: ['React', 'Hooks', 'useRef'] }
        ]);
      });
  }, []);

  if (!isReady) return <AccessDenied pageName="Extension Hub" />;

  const handleTogglePause = async () => {
    if (!status) return;
    try {
      const res = await apiFetch<any>('/api/extension/status/pause', {
        method: 'POST',
        body: JSON.stringify({ pause: !status.globalPause })
      });
      setStatus({ ...status, globalPause: res.global_pause });
    } catch (err: any) {
      setStatus({ ...status, globalPause: !status.globalPause }); // mock toggle
    }
  };

  if (!stats) return <div style={{ padding: '40px', color: '#78716c' }}>Loading Extension Hub...</div>;

  return (
    <div className="responsive-sidebar-layout" style={{ backgroundColor: '#FAFAF9' }}>
      
      {/* LEFT COLUMN */}
      <div style={{ flex: '3', minWidth: 0, borderRight: '1px solid #e7e5e4', padding: '40px', paddingBottom: '80px', overflowY: 'auto', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#11120D', margin: '0 0 32px 0', fontFamily: 'Playfair Display, serif' }}>Extension Hub</h1>
        
        {/* Extension Onboarding Guide */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px', marginBottom: '32px', color: '#166534' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🚀</span> How to use the Memora Extension
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ fontWeight: 'bold', background: '#dcfce7', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
              <div><strong>Enable the Extension:</strong> Click one of the test buttons below to simulate the extension loading on your favorite platform.</div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ fontWeight: 'bold', background: '#dcfce7', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
              <div><strong>Configure your Sync:</strong> Look for the sleek Memora tab on the left side of the screen. Click it to open your settings.</div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ fontWeight: 'bold', background: '#dcfce7', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
              <div><strong>Automatic Sync:</strong> Select what you want to sync, click Enable, and just chat normally! Memora automatically beams context securely to your vault.</div>
            </div>
          </div>
        </div>

        {/* Add Extension Flow */}
        <div style={{ marginBottom: '40px' }}>
          <AddExtensionFlow />
        </div>

        {/* Status Banner */}
        <div style={{ marginBottom: '32px' }}>
          <ExtensionStatusBanner status={status} onTogglePause={handleTogglePause} />
        </div>

        {/* Platform Cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
          <PlatformCard name="ChatGPT" data={stats.platforms.chatgpt} />
          <PlatformCard name="Claude" data={stats.platforms.claude} />
          <PlatformCard name="Gemini" data={stats.platforms.gemini} />
        </div>

      </div>

      {/* RIGHT COLUMN: 35% */}
      <div style={{ flex: '0 0 35%', padding: '40px', paddingBottom: '80px', overflowY: 'auto', boxSizing: 'border-box' }}>
        
        {/* Activity Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#11120D', margin: 0 }}>Capture History</h2>
            <div style={{ display: 'flex', backgroundColor: '#e7e5e4', padding: '4px', borderRadius: '8px' }}>
              <button onClick={() => setView('log')} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: view === 'log' ? 'white' : 'transparent', color: view === 'log' ? '#11120D' : '#78716c', boxShadow: view === 'log' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Log view</button>
              <button onClick={() => setView('timeline')} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: view === 'timeline' ? 'white' : 'transparent', color: view === 'timeline' ? '#11120D' : '#78716c', boxShadow: view === 'timeline' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Timeline view</button>
            </div>
          </div>

          {view === 'log' ? (
            <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', overflow: 'hidden' }}>
              {activity.map(entry => (
                <ActivityLogEntry key={entry.id} entry={entry} />
              ))}
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <button style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Load 20 more</button>
              </div>
            </div>
          ) : (
            <ActivityCalendar />
          )}
        </div>





        {/* Total Stats */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#11120D', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Statistics</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #f5f5f4', marginBottom: '12px', fontSize: '13px' }}>
            <span style={{ color: '#565449' }}>Total memories ingested</span>
            <span style={{ fontWeight: 600, color: '#11120D' }}>{stats.totalIngested}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #f5f5f4', marginBottom: '12px', fontSize: '13px' }}>
            <span style={{ color: '#565449' }}>Conversations processed</span>
            <span style={{ fontWeight: 600, color: '#11120D' }}>{stats.conversationsProcessed}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#565449' }}>Duplicates skipped</span>
            <span style={{ fontWeight: 600, color: '#11120D' }}>{stats.duplicatesSkipped}</span>
          </div>
        </div>



        {/* Privacy Controls */}
        <div style={{ marginBottom: '32px' }}>
          <PrivacyControlPanel />
        </div>



      </div>

    </div>
  );
}
