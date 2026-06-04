'use client';
import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import MemoryActivityChart from '../../components/insights/MemoryActivityChart';
import EmotionalJourneyChart from '../../components/insights/EmotionalJourneyChart';
import MemoryHealthDonut from '../../components/insights/MemoryHealthDonut';
import InsightCard from '../../components/extension/InsightCard';
import Link from 'next/link';
import {
  fetchSummary,
  fetchMemoryActivity,
  fetchEmotionalHistory,
  fetchTopEntities,
  type DashboardSummary,
  type MemoryActivityData,
  type EmotionalHistoryData,
  type EntityItem,
} from '../../services/dashboardService';
import { useProtectedRoute } from '../../lib/useProtectedRoute';
import AccessDenied from '../../components/AccessDenied';

export default function InsightsOverview() {
  const { isReady } = useProtectedRoute();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activityData, setActivityData] = useState<MemoryActivityData | null>(null);
  const [emotionalData, setEmotionalData] = useState<EmotionalHistoryData | null>(null);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [sum, activity, emotional, ents] = await Promise.all([
          fetchSummary(),
          fetchMemoryActivity(),
          fetchEmotionalHistory(),
          fetchTopEntities(),
        ]);
        setSummary(sum);
        setActivityData(activity);
        setEmotionalData(emotional);
        setEntities(ents);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load insights data.');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  if (!isReady) return <AccessDenied pageName="Insights" />;

  const StatCard = ({ title, value, subtext, trend, positive }: any) => (
    <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px', flex: 1 }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '32px', fontWeight: 700, color: '#11120D' }}>{value}</span>
        {trend && (
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600, color: positive ? '#22c55e' : '#ef4444' }}>
            {positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />} {trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: '13px', color: '#57534e' }}>{subtext}</div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#78716c', fontSize: '15px' }}>
        Loading insights…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#ef4444', fontSize: '15px' }}>
        {error}
      </div>
    );
  }

  const totalMemories = summary?.total_memories?.toLocaleString() ?? '—';
  const healthScore = summary?.memory_health_score != null ? `${summary.memory_health_score}%` : '—';
  const activeGoals = summary?.active_goals ?? '—';
  const emotionalBaseline = summary?.emotional_baseline != null
    ? (summary.emotional_baseline >= 0 ? `+${summary.emotional_baseline.toFixed(1)}` : `${summary.emotional_baseline.toFixed(1)}`)
    : '—';

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#11120D', margin: '0 0 32px 0', fontFamily: 'Playfair Display, serif' }}>Insights Overview</h1>

      {/* Extension Insights - Moved to TOP for visibility */}
      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '24px', marginBottom: '32px', boxSizing: 'border-box' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '22px' }}>🧠</span> Extension Insights</h3>
        <p style={{ fontSize: '14px', color: '#166534', margin: '0 0 20px 0', opacity: 0.9 }}>What Memora has noticed from your cross-platform AI usage</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <InsightCard icon="🔁" text="You use ChatGPT for coding and Claude for writing. Memora has unified these into one memory." />
          <InsightCard icon="📈" text="Your AI usage is up 34% this week — mostly late-night sessions on Claude." />
          <InsightCard icon="🏷️" text="Top topics across all platforms this month: Career, Python, Relationships, Health." />
        </div>
      </div>

      {/* Row 1: Stat Cards */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
        <StatCard title="Total Memories" value={totalMemories} subtext="All-time memories stored" trend={null} positive={true} />
        <StatCard title="Memory Health" value={healthScore} subtext="Memory health score" trend={null} positive={false} />
        <StatCard title="Active Goals" value={activeGoals} subtext={`${summary?.completed_goals ?? 0} completed`} trend={null} positive={true} />
        <StatCard title="Emotional Baseline" value={emotionalBaseline} subtext="Trending positive" trend={null} positive={(summary?.emotional_baseline ?? 0) >= 0} />
      </div>

      {/* Row 2: Charts */}
      <div className="responsive-row" style={{ marginBottom: '32px' }}>
        <div style={{ flex: '3', minWidth: 0, backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#11120D' }}>Memory Activity</h3>
            <Link href="/insights/memory-activity" style={{ fontSize: '13px', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>View details &rarr;</Link>
          </div>
          <MemoryActivityChart height={280} data={activityData ?? undefined} />
        </div>

        <div style={{ flex: '2', minWidth: 0, backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#11120D' }}>Emotional Journey</h3>
            <Link href="/insights/emotional-journey" style={{ fontSize: '13px', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>View details &rarr;</Link>
          </div>
          <EmotionalJourneyChart height={280} data={emotionalData ?? undefined} />
        </div>
      </div>

      {/* Row 3: Entities & Health */}
      <div className="responsive-row" style={{ marginBottom: '32px' }}>

        {/* Top Entities Table */}
        <div style={{ flex: '1', minWidth: 0, backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', overflowX: 'auto', boxSizing: 'border-box' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e7e5e4', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#11120D' }}>Top Entities</h3>
            <Link href="/insights/top-entities" style={{ fontSize: '13px', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>View all &rarr;</Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAFAF9', color: '#78716c', textAlign: 'left', borderBottom: '1px solid #e7e5e4' }}>
                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '12px 24px', fontWeight: 600 }}>Mentions</th>
              </tr>
            </thead>
            <tbody>
              {entities.slice(0, 5).map((entity) => (
                <tr key={entity.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '12px 24px', fontWeight: 500, color: '#11120D' }}>{entity.name}</td>
                  <td style={{ padding: '12px 24px', color: '#57534e' }}>{entity.type}</td>
                  <td style={{ padding: '12px 24px', color: '#57534e' }}>{entity.mentions}</td>
                </tr>
              ))}
              {entities.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '16px 24px', color: '#78716c', textAlign: 'center' }}>No entities found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Memory Health Donut */}
        <div style={{ flex: '1', minWidth: 0, backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#11120D' }}>Memory Health</h3>
            <Link href="/insights/memory-health" style={{ fontSize: '13px', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>Improve health &rarr;</Link>
          </div>
          <MemoryHealthDonut height={280} />
        </div>

      </div>

      {/* Row 4: Heatmap (Mocked via simple colored squares for now) */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px', marginBottom: '32px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#11120D' }}>Memory Heatmap</h3>
          <select style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e7e5e4' }}>
            <option>2025</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {Array.from({ length: 365 }).map((_, i) => (
            <div key={i} style={{
              width: '14px', height: '14px', borderRadius: '2px',
              backgroundColor: Math.random() > 0.8 ? '#22c55e' : Math.random() > 0.5 ? '#86efac' : Math.random() > 0.2 ? '#dcfce7' : '#f5f5f4'
            }} />
          ))}
        </div>
      </div>

      {/* Row 5: Digest & Goals */}
      <div className="responsive-row">
        <div style={{ flex: '1.2', minWidth: 0, backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#11120D' }}>Goals Progress</h3>
            <Link href="/goals" style={{ fontSize: '13px', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>View goals &rarr;</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { n: 'Finish Memora MVP', p: 72 },
              { n: 'Marathon Training', p: 45 },
              { n: 'Read 20 books', p: 15 }
            ].map((g, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 500, color: '#11120D' }}>{g.n}</span>
                  <span style={{ color: '#78716c' }}>{g.p}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#f5f5f4', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${g.p}%`, backgroundColor: '#11120D' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: '1', minWidth: 0, backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px', backgroundImage: 'linear-gradient(to bottom right, #FAFAF9, #f0fdf4)', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#11120D' }}>Weekly Digest Preview</h3>
          <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '13px', color: '#57534e', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <li>You spent 40% of your AI conversations discussing React architecture.</li>
            <li>Your emotional tone trended positive towards the end of the week.</li>
            <li>New entity detected: <strong>Docker Swarm</strong>.</li>
          </ul>
          <Link href="/insights/weekly-digest" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#16a34a', textDecoration: 'none' }}>
            Read full digest <ArrowRight size={14} />
          </Link>
        </div>
      </div>



    </div>
  );
}
