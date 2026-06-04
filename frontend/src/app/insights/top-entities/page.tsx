'use client';
import React, { useState } from 'react';
import { MOCK_ENTITIES } from '../../../services/mockInsightsData';
import { ArrowRight, Search, X } from 'lucide-react';

export default function TopEntitiesPage() {
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  return (
    <div style={{ display: 'flex', gap: '32px', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#11120D', margin: '0 0 8px 0', fontFamily: 'Playfair Display, serif' }}>Top Entities</h1>
          <p style={{ fontSize: '14px', color: '#57534e', margin: 0 }}>People, places, projects, and concepts you mention most frequently.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} color="#a8a29e" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Search entities..." style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <select style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '14px', backgroundColor: 'white' }}>
            <option>All Types</option>
            <option>Person</option>
            <option>Project</option>
            <option>Concept</option>
            <option>Habit</option>
          </select>
        </div>

        <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAFAF9', color: '#78716c', textAlign: 'left', borderBottom: '1px solid #e7e5e4', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Mentions</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Connected</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Last Seen</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ENTITIES.map((entity) => (
                <tr 
                  key={entity.id} 
                  onClick={() => setSelectedEntity(entity)}
                  style={{ borderBottom: '1px solid #f5f5f4', cursor: 'pointer', backgroundColor: selectedEntity?.id === entity.id ? '#f0f9ff' : 'white', transition: 'background-color 0.2s' }}
                >
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: '#11120D' }}>{entity.name}</td>
                  <td style={{ padding: '16px 24px', color: '#57534e' }}>
                    <span style={{ backgroundColor: '#f5f5f4', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>{entity.type}</span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#11120D', fontWeight: 600 }}>{entity.mentions}</td>
                  <td style={{ padding: '16px 24px', color: '#57534e' }}>{entity.connections}</td>
                  <td style={{ padding: '16px 24px', color: '#57534e' }}>{entity.lastSeen}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                      Graph <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEntity && (
        <div style={{ width: '320px', backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px', position: 'relative' }}>
          <button 
            onClick={() => setSelectedEntity(null)}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#a8a29e', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{selectedEntity.type}</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#11120D', margin: 0 }}>{selectedEntity.name}</h2>
          </div>

          <div style={{ fontSize: '13px', color: '#57534e', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f5f5f4' }}>
              <span>First mentioned</span><span style={{ fontWeight: 600, color: '#11120D' }}>{selectedEntity.firstSeen}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f5f5f4' }}>
              <span>Last mentioned</span><span style={{ fontWeight: 600, color: '#11120D' }}>{selectedEntity.lastSeen}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#11120D', marginBottom: '16px' }}>Recent Memories</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '13px', color: '#57534e', fontStyle: 'italic' }}>
                "Working on the layout for {selectedEntity.name} today. It needs to be clean and responsive."
              </div>
              <div style={{ padding: '12px', backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '13px', color: '#57534e', fontStyle: 'italic' }}>
                "Discussed {selectedEntity.name} scaling issues with the team."
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
