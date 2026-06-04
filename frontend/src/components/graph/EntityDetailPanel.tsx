'use client';

import React from 'react';
import Link from 'next/link';
import { GraphNode, GraphEdge } from '../../services/graphService';
import { GRAPH_COLORS } from './GraphSidebar';
import { X, ExternalLink, Calendar, MessageSquare, Target } from 'lucide-react';

export default function EntityDetailPanel({ 
  entityId, 
  nodes, 
  edges, 
  onClose 
}: { 
  entityId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClose: () => void;
}) {
  const entity = nodes.find(n => n.id === entityId);
  if (!entity) return null;

  // Find connections
  const connectedEdges = edges.filter(e => e.source === entityId || e.target === entityId);
  const topConnections = connectedEdges.map(edge => {
    const isSource = edge.source === entityId;
    const relatedNode = nodes.find(n => n.id === (isSource ? edge.target : edge.source));
    return { relatedNode, strength: edge.strength, label: edge.label };
  }).filter(c => c.relatedNode).sort((a, b) => b.strength - a.strength).slice(0, 5);

  const typeColor = GRAPH_COLORS[entity.type];

  return (
    <div style={{ 
      width: '320px', borderLeft: '1px solid #e7e5e4', backgroundColor: 'white', 
      display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0.02)',
      flexShrink: 0 // Prevent panel from shrinking, forces main canvas to shrink
    }}>
      
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #f5f5f4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ backgroundColor: typeColor, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
            {entity.type}
          </span>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#11120D', margin: '8px 0 0 0', fontFamily: 'Playfair Display, serif' }}>
            {entity.name}
          </h2>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0988A', padding: '4px' }}>
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#A0988A', fontWeight: 600, textTransform: 'uppercase' }}>Mentions</div>
            <div style={{ fontSize: '20px', color: '#11120D', fontWeight: 600 }}>{entity.mentions}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#A0988A', fontWeight: 600, textTransform: 'uppercase' }}>First Seen</div>
            <div style={{ fontSize: '14px', color: '#11120D', fontWeight: 500, marginTop: '4px' }}>Recently</div>
          </div>
        </div>

        {/* Top Connections */}
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', margin: '0 0 16px 0', textTransform: 'uppercase' }}>
            Top Connections
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topConnections.map((conn, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: GRAPH_COLORS[conn.relatedNode!.type] || '#565449' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#11120D' }}>{conn.relatedNode!.name}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#565449', fontStyle: 'italic' }}>{conn.label}</span>
                </div>
                {/* Strength bar */}
                <div style={{ width: '100%', height: '4px', backgroundColor: '#f5f5f4', borderRadius: '2px' }}>
                  <div style={{ width: `${(conn.strength / 5) * 100}%`, height: '100%', backgroundColor: '#D8CFBC', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Memories Snippets */}
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', margin: '0 0 16px 0', textTransform: 'uppercase' }}>
            Recent Memories
          </h4>
          <div style={{ backgroundColor: '#FAFAF9', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', color: '#11120D', margin: '0 0 12px 0', lineHeight: 1.5 }}>
              "Had a breakthrough conversation about shifting career focus entirely to AI architecture. Felt highly energized."
            </p>
            <Link href="/memory" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#0284c7', textDecoration: 'none' }}>
              View 14 memories →
            </Link>
          </div>
        </div>

        {/* Linked Goals (Mock conditional) */}
        {entity.type === 'concept' || entity.type === 'person' ? (
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
              Linked Goals
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', border: '1px dashed #D8CFBC', borderRadius: '8px' }}>
              <Target size={14} color="#6d28d9" />
              <span style={{ fontSize: '13px', color: '#11120D' }}>Become TPM</span>
            </div>
          </div>
        ) : null}

      </div>

      {/* Footer Action */}
      <div style={{ padding: '24px', borderTop: '1px solid #f5f5f4', backgroundColor: 'white' }}>
        <Link href="/chat" style={{ textDecoration: 'none' }}>
          <button style={{ 
            width: '100%', backgroundColor: '#11120D', color: '#FFFBF4', border: 'none', 
            borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 600, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
          }}>
            <MessageSquare size={16} /> Start chat about {entity.name}
          </button>
        </Link>
      </div>

    </div>
  );
}
