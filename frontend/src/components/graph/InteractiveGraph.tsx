'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { GraphNode, GraphEdge } from '../../services/graphService';
import { GRAPH_COLORS } from './GraphSidebar';
import { Maximize, ZoomIn, ZoomOut, RefreshCw, Box, Settings } from 'lucide-react';

// Dynamically import the force graph to prevent Next.js SSR issues with canvas/browser APIs
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
  ssr: false,
  loading: () => <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#11120D', color: '#A0988A' }}>Initializing Physics Engine...</div>
});

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeSelect: (id: string) => void;
  selectedNodeId: string | null;
}

export default function InteractiveGraph({ nodes, edges, onNodeSelect, selectedNodeId }: Props) {
  const fgRef = useRef<any>(null);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);

  // Memoize graph data so the physics engine doesn't constantly reset
  const graphData = useMemo(() => ({
    nodes: nodes.map(n => ({ ...n })),
    links: edges.map(e => ({ ...e }))
  }), [nodes, edges]);

  // Compute connections for fast lookup during hover states
  const highlightNodes = useMemo(() => {
    const set = new Set<string>();
    if (hoverNode) {
      set.add(hoverNode.id);
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
        if (sourceId === hoverNode.id) set.add(targetId);
        if (targetId === hoverNode.id) set.add(sourceId);
      });
    }
    if (selectedNodeId) {
      set.add(selectedNodeId);
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
        if (sourceId === selectedNodeId) set.add(targetId);
        if (targetId === selectedNodeId) set.add(sourceId);
      });
    }
    return set;
  }, [hoverNode, selectedNodeId, graphData.links]);

  const highlightLinks = useMemo(() => {
    const set = new Set<string>();
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      if (
        (hoverNode && (sourceId === hoverNode.id || targetId === hoverNode.id)) ||
        (selectedNodeId && (sourceId === selectedNodeId || targetId === selectedNodeId))
      ) {
        set.add(link.id);
      }
    });
    return set;
  }, [hoverNode, selectedNodeId, graphData.links]);

  // Handle zooming to fit
  const handleZoomToFit = useCallback(() => {
    if (fgRef.current) fgRef.current.zoomToFit(400, 50);
  }, []);

  usePhysicsConfig(fgRef);

  return (
    <div style={{ flex: 1, backgroundColor: '#11120D', position: 'relative', overflow: 'hidden' }}>
      
      {/* Top Left Overlays */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, display: 'flex', gap: '8px' }}>
        <button style={overlayBtnStyle}>Cluster ○</button>
      </div>

      {/* Bottom Right Overlays */}
      <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <button style={iconBtnStyle} title="Zoom In"><ZoomIn size={16} /></button>
        <button style={iconBtnStyle} title="Zoom Out"><ZoomOut size={16} /></button>
        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
        <button style={iconBtnStyle} title="Reset view"><RefreshCw size={16} /></button>
        <button style={iconBtnStyle} title="Focus selected"><Box size={16} /></button>
        <button onClick={handleZoomToFit} style={iconBtnStyle} title="Fit all"><Maximize size={16} /></button>
        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
        <button style={iconBtnStyle} title="Settings"><Settings size={16} /></button>
      </div>

      <div style={{ width: '100%', height: '100%' }}>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          backgroundColor="#11120D"
          
          // Nodes
          nodeRelSize={4}
          nodeVal={node => (node as GraphNode).val}
          nodeLabel="" // We use custom rendering instead of native title
          
          // Custom Canvas Node Rendering for premium aesthetic
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const isHighlighted = highlightNodes.has(node.id);
            const isSelected = selectedNodeId === node.id;
            const isDimmed = (hoverNode || selectedNodeId) && !isHighlighted;
            
            const color = GRAPH_COLORS[node.type as keyof typeof GRAPH_COLORS] || '#a8a29e';
            const radius = Math.sqrt(node.val) * 4;

            // Draw glowing halo if highlighted/selected
            if (isHighlighted || isSelected) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
              ctx.fillStyle = `${color}40`; // 25% opacity
              ctx.fill();
            }

            // Draw main node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = isDimmed ? '#292524' : color;
            ctx.fill();
            
            // Draw crisp border
            ctx.lineWidth = 1 / globalScale;
            ctx.strokeStyle = isDimmed ? '#44403c' : '#ffffff';
            ctx.stroke();

            // Text Rendering
            const fontSize = 12 / globalScale;
            if (globalScale >= 1.5 || isHighlighted) {
              ctx.font = `${isSelected ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = isDimmed ? '#57534e' : '#f5f5f4';
              ctx.fillText(node.name, node.x, node.y + radius + (8 / globalScale));
            }
          }}

          // Links
          linkWidth={link => highlightLinks.has((link as GraphEdge).id) ? 2 : 1}
          linkColor={link => highlightLinks.has((link as GraphEdge).id) ? '#a8a29e' : '#292524'}
          linkDirectionalParticles={link => highlightLinks.has((link as GraphEdge).id) ? 2 : 0}
          linkDirectionalParticleWidth={2}
          
          // Custom Edge text rendering
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(link: any, ctx, globalScale) => {
            if (highlightLinks.has(link.id)) {
              const start = link.source;
              const end = link.target;
              if (typeof start !== 'object' || typeof end !== 'object') return;
              
              const textPos = {
                x: start.x + (end.x - start.x) / 2,
                y: start.y + (end.y - start.y) / 2
              };
              
              const fontSize = 10 / globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#d6d3d1';
              
              // Draw a tiny dark background pill for the text
              const textWidth = ctx.measureText(link.label).width;
              const bgPadding = 4 / globalScale;
              ctx.fillStyle = '#11120D';
              ctx.fillRect(textPos.x - textWidth/2 - bgPadding, textPos.y - fontSize/2 - bgPadding, textWidth + bgPadding*2, fontSize + bgPadding*2);
              
              ctx.fillStyle = '#d6d3d1';
              ctx.fillText(link.label, textPos.x, textPos.y);
            }
          }}

          // Interaction
          onNodeClick={(node: any) => onNodeSelect(node.id)}
          onNodeHover={(node: any) => setHoverNode(node || null)}
          
          // Physics Configuration
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      </div>

    </div>
  );
}

// Effect to configure custom d3-force parameters once graph is mounted
// We do this by attaching it to the component outside the render cycle or inside a useEffect
// Let's actually add the useEffect inside the component

export function usePhysicsConfig(fgRef: React.MutableRefObject<any>) {
  useEffect(() => {
    if (fgRef.current) {
      // Increase repulsion drastically to push nodes apart
      fgRef.current.d3Force('charge').strength(-800);
      // Increase default link distance
      fgRef.current.d3Force('link').distance(150);
      // Re-warm the simulation to apply new forces
      fgRef.current.d3ReheatSimulation();
    }
  }, [fgRef]);
}

const overlayBtnStyle = { 
  backgroundColor: 'rgba(255,255,255,0.05)', color: '#f5f5f4', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px',
  padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(10px)'
};
const iconBtnStyle = { background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#a8a29e', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' };
