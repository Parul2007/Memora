'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  Network, Activity, Clock, ChevronRight, BookOpen, AlertCircle,
  Layers, Ghost, Search, Send, Play, PieChart as PieChartIcon,
  ExternalLink, ArrowRight, RefreshCw, Zap
} from 'lucide-react';
import {
  AreaChart, Area, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { apiFetch } from '../../../services/apiClient';
import { ViewType } from '../MemoryLayout';

const fetcher = (url: string) => apiFetch<any>(url);

interface DashboardProps {
  onOpenMemory: (id: string) => void;
  onNavigate?: (view: ViewType) => void;
}

// ─── colour palette (matches V3 screenshot) ──────────────────────────────────
const PIE_COLORS = ['#8B5CF6', '#F97316', '#3B82F6', '#10B981'];
const ROUTE_MAP: Record<string, ViewType> = {
  dashboard: 'dashboard',
  explorer: 'explorer',
  timeline: 'timeline',
  learning: 'learning',
};

export default function DashboardView({ onOpenMemory, onNavigate }: DashboardProps) {
  const { data: intel, isLoading, mutate } = useSWR<any>('/api/dashboard/intelligence', fetcher, {
    refreshInterval: 60_000, // auto-refresh every minute
  });
  const [captureText, setCaptureText] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureOk, setCaptureOk] = useState(false);

  // ── Quick Capture ───────────────────────────────────────────────────────────
  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim() || isCapturing) return;
    setIsCapturing(true);
    try {
      await apiFetch('/api/memory/', {
        method: 'POST',
        body: JSON.stringify({
          content: captureText,
          memory_type: 'semantic',
          metadata: { source: 'dashboard_quick_capture' },
        }),
      });
      setCaptureText('');
      setCaptureOk(true);
      setTimeout(() => setCaptureOk(false), 2000);
      mutate();
    } catch (err) {
      console.error('Quick capture failed', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // ── Continue Working navigation ─────────────────────────────────────────────
  const handleContinue = (cw: any) => {
    if (cw.memory_id) {
      onOpenMemory(cw.memory_id);
    } else if (cw.route && ROUTE_MAP[cw.route]) {
      onNavigate?.(ROUTE_MAP[cw.route]);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading || !intel) {
    return (
      <div className="flex justify-center items-center h-full bg-[#F9FAFB]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ color: '#6B7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Activity size={14} color="#3B82F6" className="animate-pulse" /> Initialising Dashboard
        </motion.div>
      </div>
    );
  }

  const { fading_memories, active_context, continue_working, memory_inbox, evolution, domains, distribution } = intel;

  return (
    <div
      style={{ height: '100%', width: '100%', background: '#F9FAFB', color: '#111827', display: 'flex', flexDirection: 'column', padding: '32px', overflowY: 'auto', gap: '24px' }}
      className="custom-scrollbar"
    >
      {/* ── HEADER + QUICK CAPTURE ─────────────────────────────────────────── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '30px', fontFamily: 'Georgia, serif', fontWeight: 400, color: '#111827', margin: 0 }}>Dashboard</h1>

        <form onSubmit={handleCapture} style={{ flex: 1, maxWidth: '420px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={captureText}
            onChange={e => setCaptureText(e.target.value)}
            placeholder={captureOk ? '✓ Memory saved!' : 'Capture a thought or memory... (Press Enter)'}
            style={{
              width: '100%',
              background: captureOk ? '#F0FDF4' : '#FFFFFF',
              border: `1px solid ${captureOk ? '#86EFAC' : '#E5E7EB'}`,
              borderRadius: '999px',
              padding: '10px 44px 10px 20px',
              fontSize: '13px',
              color: '#374151',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => { if (!captureOk) e.target.style.borderColor = '#3B82F6'; }}
            onBlur={e => { e.target.style.borderColor = captureOk ? '#86EFAC' : '#E5E7EB'; }}
          />
          <button
            type="submit"
            disabled={isCapturing || !captureText.trim()}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: '#DBEAFE',
              border: 'none',
              cursor: captureText.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: captureText.trim() ? 1 : 0.4,
              transition: 'opacity 0.2s',
            }}
          >
            <Send size={13} color="#3B82F6" />
          </button>
        </form>
      </header>

      {/* ── ROW 1 ── Memory Inbox + Continue Working ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>

        {/* MEMORY INBOX */}
        <Card title="MEMORY INBOX" icon={<AlertCircle size={14} color="#3B82F6" />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <InboxTile
              label="Fading"
              count={memory_inbox?.fading}
              tooltip="Memories older than 7 days"
              onClick={() => onNavigate?.('timeline')}
            />
            <InboxTile
              label="Orphaned"
              count={memory_inbox?.orphaned}
              tooltip="Low-importance memories"
              onClick={() => onNavigate?.('explorer')}
            />
            <InboxTile
              label="Conflicting"
              count={memory_inbox?.conflicting}
              tooltip="Mid-range importance band"
              onClick={() => onNavigate?.('explorer')}
            />
            <InboxTile
              label="Unlinked"
              count={memory_inbox?.unlinked}
              tooltip="Memories with no metadata"
              onClick={() => onNavigate?.('explorer')}
            />
          </div>
        </Card>

        {/* CONTINUE WORKING */}
        <Card title="CONTINUE WORKING" icon={<Play size={14} color="#3B82F6" />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {continue_working?.map((cw: any, idx: number) => (
              <button
                key={idx}
                onClick={() => handleContinue(cw)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '14px 16px',
                  background: '#F9FAFB',
                  border: '1px solid #F3F4F6',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                  width: '100%',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#F3F4F6';
                  e.currentTarget.style.background = '#F9FAFB';
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>
                  {cw.label}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                  {cw.action}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* ── ROW 2 ── Charts ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

        {/* EVOLUTION CHART */}
        <Card title="RECENT MEMORY INTERACTIONS" icon={<Activity size={14} color="#3B82F6" />} noPadBottom>
          <div style={{ height: '260px' }}>
            {evolution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="date" axisLine={{ stroke: '#E5E7EB' }} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={10} interval={3} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    itemStyle={{ color: '#111827', fontWeight: 600 }}
                    labelStyle={{ color: '#6B7280', fontSize: '10px', textTransform: 'uppercase' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty message="Start chatting to generate memory interactions." />
            )}
          </div>
        </Card>

        {/* DISTRIBUTION PIE */}
        <Card title="MEMORY DISTRIBUTION" icon={<PieChartIcon size={14} color="#3B82F6" />} noPadBottom>
          <div style={{ height: '260px' }}>
            {distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} cx="50%" cy="42%" innerRadius={65} outerRadius={88} paddingAngle={4} dataKey="value" stroke="none">
                    {distribution.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    itemStyle={{ fontWeight: 600, color: '#111827' }}
                  />
                  <Legend verticalAlign="bottom" height={30} iconType="circle" iconSize={7}
                    wrapperStyle={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty message="No memories yet." />
            )}
          </div>
        </Card>
      </div>

      {/* ── ROW 3 ── Fading + Active Context + Domains ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'stretch' }}>

        {/* FADING MEMORIES — spaced-repetition layer */}
        <Card title="FADING MEMORIES" icon={<Ghost size={14} color="#10B981" />} fixedHeight>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '280px' }} className="custom-scrollbar">
            {fading_memories?.length > 0 ? fading_memories.map((mem: any, idx: number) => (
              <FadingCard key={idx} mem={mem} onClick={() => onOpenMemory(mem.id)} />
            )) : (
              <Empty message="No fading memories — your knowledge is fresh." />
            )}
          </div>
        </Card>

        {/* ACTIVE CONTEXT — working memory feed */}
        <Card title="ACTIVE CONTEXT" icon={<BookOpen size={14} color="#3B82F6" />} fixedHeight>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '280px' }} className="custom-scrollbar">
            {active_context?.length > 0 ? active_context.slice(0, 5).map((ctx: any, idx: number) => (
              <button
                key={idx}
                onClick={() => onOpenMemory(ctx.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  width: '100%', padding: '10px 12px',
                  background: '#F9FAFB', border: '1px solid #F3F4F6',
                  borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#BFDBFE'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#F3F4F6'}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                  {ctx.title}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '3px' }}>
                  {ctx.type} · {ctx.time_ago}
                </span>
              </button>
            )) : (
              <Empty message="Start chatting to populate your active context." />
            )}
          </div>
        </Card>

        {/* KNOWLEDGE DOMAINS */}
        <Card title="KNOWLEDGE DOMAINS" icon={<Layers size={14} color="#10B981" />} fixedHeight>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {domains?.length > 0 ? domains.map((dom: any, idx: number) => (
              <button
                key={idx}
                onClick={() => onNavigate?.('explorer')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 12px',
                  background: '#F9FAFB', border: '1px solid #F3F4F6',
                  borderRadius: '10px', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#A7F3D0'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#F3F4F6'}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{dom.name}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                  {dom.nodes}
                </span>
              </button>
            )) : (
              <Empty message="No domains found." />
            )}

            {/* Fact Explorer shortcut */}
            <button
              onClick={() => window.location.href = '/graph'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                width: '100%', padding: '10px 12px', marginTop: '4px',
                background: '#EFF6FF', border: '1px solid #DBEAFE',
                borderRadius: '10px', cursor: 'pointer',
                fontSize: '11px', fontWeight: 700, color: '#3B82F6',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
              onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
            >
              Open Graph <ArrowRight size={12} />
            </button>
          </div>
        </Card>
      </div>

    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Card({ title, icon, children, noPadBottom, fixedHeight }: { title: string; icon: React.ReactNode; children: React.ReactNode; noPadBottom?: boolean; fixedHeight?: boolean }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #F3F4F6',
      borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      padding: noPadBottom ? '20px 20px 0 20px' : '20px',
      ...(fixedHeight ? { height: '360px', display: 'flex', flexDirection: 'column' } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', flexShrink: 0 }}>
        {icon}
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          {title}
        </span>
      </div>
      <div style={fixedHeight ? { flex: 1, minHeight: 0 } : {}}>
        {children}
      </div>
    </div>
  );
}

// Colour per inbox category — always solid, never gray
const INBOX_COLORS: Record<string, string> = {
  Fading:      '#F97316',
  Orphaned:    '#EF4444',
  Conflicting: '#8B5CF6',
  Unlinked:    '#3B82F6',
};

function InboxTile({ label, count, tooltip, onClick }: {
  label: string; count: number; tooltip?: string; onClick: () => void;
}) {
  const solidColor = INBOX_COLORS[label] || '#6B7280';
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '16px 8px',
        background: '#F9FAFB', border: '1px solid #F3F4F6',
        borderRadius: '12px', cursor: 'pointer',
        transition: 'border-color 0.15s',
        width: '100%',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#E5E7EB'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#F3F4F6'}
    >
      <span style={{ fontSize: '22px', fontWeight: 700, color: solidColor }}>
        {count ?? 0}
      </span>
      <span style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '4px' }}>
        {label}
      </span>
    </button>
  );
}

function FadingCard({ mem, onClick }: { mem: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '11px 12px',
        background: '#F0FDF4', border: '1px solid #BBF7D0',
        borderRadius: '10px', cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#86EFAC'; e.currentTarget.style.background = '#DCFCE7'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#BBF7D0'; e.currentTarget.style.background = '#F0FDF4'; }}
    >
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#166534', margin: '0 0 4px 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {mem.title}
      </p>
      <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {mem.age_days}d ago · {mem.relevance}% relevance
      </span>
    </button>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div style={{ padding: '20px 0', textAlign: 'center' }}>
      <p style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>{message}</p>
    </div>
  );
}
