'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MemoryData } from '../../services/mockMemories';
import { fetchMemories } from '../../services/memoryService';
import { Calendar } from 'lucide-react';

export default function MemoryTimeline({ filterView, filterType }: { filterView: string, filterType: string | null }) {
  const [memories, setMemories] = useState<MemoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMemories().then(data => {
      if (!cancelled) {
        setMemories(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);
  
  let filteredMemories = memories;
  if (filterType) filteredMemories = filteredMemories.filter(m => m.type === filterType);
  if (filterView === 'pinned') filteredMemories = filteredMemories.filter(m => m.pinned);
  else if (filterView === 'fading') filteredMemories = filteredMemories.filter(m => m.decayFactor >= 0.7);

  // Sort by date descending
  const sorted = [...filteredMemories].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

  // Group by date logic (mocking simple groups based on timestamp string for prototype)
  const grouped = sorted.reduce((acc, mem) => {
    // Basic grouping by date
    const t = mem.timestamp || 'Unknown Date';
    if (!acc[t]) acc[t] = [];
    acc[t].push(mem);
    return acc;
  }, {} as Record<string, typeof sorted>);

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center', color: '#A0988A' }}>Loading timeline...</div>;
  }

  return (
    <div style={{ padding: '32px 64px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {Object.entries(grouped).map(([dateLabel, memories]) => (
        <div key={dateLabel}>
          
          {/* Date Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#11120D', fontSize: '14px', fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>
              <Calendar size={16} /> {dateLabel}
            </div>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e7e5e4' }} />
          </div>

          {/* Timeline Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '8px', borderLeft: '2px solid #e7e5e4' }}>
            {memories.map(mem => {
              
              // Edge coloring logic based on type/emotion
              let edgeColor = 'transparent';
              if (mem.type === 'emotional') edgeColor = mem.content.includes('energized') ? '#16a34a' : '#be185d'; // Mock sentiment analysis

              return (
                <div key={mem.id} style={{ position: 'relative', paddingLeft: '24px' }}>
                  {/* Timeline dot */}
                  <div style={{ position: 'absolute', left: '-5px', top: '24px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D8CFBC', border: '2px solid #FAFAF9' }} />
                  
                  <Link href={`/memory/${mem.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ 
                      backgroundColor: 'white', borderRadius: '16px', padding: '20px', 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #e7e5e4',
                      borderLeft: edgeColor !== 'transparent' ? `4px solid ${edgeColor}` : '1px solid #e7e5e4',
                      transition: 'all 0.2s', cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#A0988A', textTransform: 'uppercase' }}>{mem.type}</span>
                        <span style={{ fontSize: '11px', color: '#A0988A' }}>{mem.source}</span>
                      </div>
                      
                      <p style={{ fontSize: '15px', color: '#11120D', lineHeight: 1.6, margin: 0 }}>
                        "{mem.content}"
                      </p>
                      
                      {mem.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          {mem.tags.map(t => <span key={t} style={{ fontSize: '11px', color: '#565449' }}>#{t}</span>)}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

        </div>
      ))}

    </div>
  );
}
