'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, Activity, HeartPulse, FileText, CalendarRange, List, Map } from 'lucide-react';

export default function InsightsSidebar() {
  const pathname = usePathname();
  
  const NavItem = ({ href, icon: Icon, label }: any) => {
    const isActive = pathname === href;
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
          backgroundColor: isActive ? '#f5f5f4' : 'transparent',
          color: isActive ? '#1c1917' : '#57534e',
          transition: 'all 0.2s ease',
          marginBottom: '2px'
        }}>
          {Icon && <Icon size={16} color={isActive ? '#1c1917' : '#78716c'} />}
          <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500 }}>{label}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="responsive-sidebar">
      
      <div style={{ padding: '24px 16px 16px 16px' }}>
        <NavItem href="/insights" icon={LayoutDashboard} label="Overview" />
      </div>

      <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1, paddingBottom: '80px' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '12px' }}>ANALYTICS</div>
          <NavItem href="/insights/memory-activity" icon={BarChart3} label="Memory Activity" />
          <NavItem href="/insights/emotional-journey" icon={Activity} label="Emotional Journey" />
          <NavItem href="/insights/memory-health" icon={HeartPulse} label="Memory Health" />
          <NavItem href="/insights/top-entities" icon={List} label="Top Entities" />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '12px' }}>REPORTS</div>
          <NavItem href="/insights/weekly-digest" icon={FileText} label="Weekly Digest" />
          <NavItem href="/insights/monthly-report" icon={CalendarRange} label="Monthly Report (Pro)" />
          <NavItem href="/insights/memory-heatmap" icon={Map} label="Memory Heatmap" />
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #e7e5e4' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '12px', paddingLeft: '12px' }}>DATE RANGE</div>
          <select defaultValue="Last 30 days" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', backgroundColor: 'white' }}>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>This Year</option>
            <option>All Time</option>
          </select>
        </div>

      </div>
    </div>
  );
}
