'use client';
import React, { useState } from 'react';
import { Target, Flag, CheckSquare, XCircle, Activity, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function GoalsSidebar() {
  const pathname = usePathname();
  
  const NavItem = ({ href, icon: Icon, label, count, isChild = false }: any) => {
    const isActive = pathname === href;
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '8px 12px', paddingLeft: isChild ? '32px' : '12px',
          borderRadius: '8px', cursor: 'pointer',
          backgroundColor: isActive ? '#f5f5f4' : 'transparent',
          color: isActive ? '#1c1917' : '#57534e',
          transition: 'all 0.2s ease',
          marginBottom: '2px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Icon && <Icon size={16} color={isActive ? '#1c1917' : '#78716c'} />}
            <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500 }}>{label}</span>
          </div>
          {count !== undefined && (
            <span style={{ fontSize: '12px', color: '#78716c', fontWeight: 500 }}>{count}</span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="responsive-sidebar">
      
      <div style={{ padding: '24px 16px 16px 16px' }}>
        <button style={{ 
          width: '100%', backgroundColor: '#11120D', color: 'white', border: 'none', 
          padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
        }}>
          + New Goal
        </button>
      </div>

      <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1, paddingBottom: '80px' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '12px' }}>MY GOALS</div>
          <NavItem href="/goals" icon={Target} label="Active" count={8} />
          <NavItem href="/goals/milestones" icon={Flag} label="Milestones" count={34} isChild />
          <NavItem href="/goals/completed" icon={CheckSquare} label="Completed" count={12} isChild />
          <NavItem href="/goals/abandoned" icon={XCircle} label="Abandoned" count={3} isChild />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '12px' }}>AI DETECTED</div>
          <NavItem href="/goals/habits" icon={Activity} label="Habits" count={19} />
          <NavItem href="/goals/life-coach" icon={BrainCircuit} label="Life Coach" />
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #e7e5e4' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.05em', marginBottom: '12px', paddingLeft: '12px' }}>FILTER GOALS</div>
          
          <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', marginBottom: '8px', backgroundColor: 'white' }}>
            <option>Priority (All)</option>
            <option>High Priority</option>
            <option>Medium Priority</option>
            <option>Low Priority</option>
          </select>
          
          <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e7e5e4', fontSize: '13px', backgroundColor: 'white' }}>
            <option>Status (All)</option>
            <option>On track</option>
            <option>At risk</option>
            <option>Overdue</option>
          </select>
        </div>

      </div>
    </div>
  );
}
