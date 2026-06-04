'use client';

import React from 'react';
import { GraphNode, GraphEdge } from '../../services/graphService';
import { GRAPH_COLORS } from './GraphSidebar';
import { ExternalLink } from 'lucide-react';

export default function GraphTableView({ 
  nodes, 
  edges, 
  onNodeSelect 
}: { 
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeSelect: (id: string) => void 
}) {
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Table Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '150px 100px 100px 150px 150px 120px 1fr', padding: '16px 32px', borderBottom: '1px solid #e7e5e4', fontSize: '11px', fontWeight: 700, color: '#A0988A', textTransform: 'uppercase', letterSpacing: '0.05em', alignItems: 'center', backgroundColor: 'white' }}>
        <div>Entity Name</div>
        <div>Type</div>
        <div>Mentions</div>
        <div>First Seen</div>
        <div>Last Seen</div>
        <div>Connections</div>
        <div style={{ textAlign: 'right' }}>Actions</div>
      </div>

      {/* Table Body */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#FAFAF9' }}>
        {[...nodes].sort((a, b) => b.mentions - a.mentions).map((node) => {
          
          const connectionCount = edges.filter(e => e.source === node.id || e.target === node.id).length;

          return (
            <div key={node.id} style={{ display: 'grid', gridTemplateColumns: '150px 100px 100px 150px 150px 120px 1fr', padding: '12px 32px', borderBottom: '1px solid #e7e5e4', fontSize: '13px', color: '#11120D', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{node.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: GRAPH_COLORS[node.type] }} />
                <span style={{ textTransform: 'capitalize', color: '#565449' }}>{node.type}</span>
              </div>
              <div>{node.mentions}</div>
              <div style={{ color: '#565449' }}>{node.firstSeen}</div>
              <div style={{ color: '#565449' }}>{node.lastSeen}</div>
              <div>{connectionCount} edges</div>
              <div style={{ textAlign: 'right' }}>
                <button 
                  onClick={() => onNodeSelect(node.id)}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}
                >
                  View in graph <ExternalLink size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
