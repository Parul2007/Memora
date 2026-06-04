'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InteractiveGraph from './InteractiveGraph';
import GraphTableView from './GraphTableView';
import EntityDetailPanel from './EntityDetailPanel';
import { fetchGraph, GraphNode, GraphEdge } from '../../services/graphService';

export default function GraphMainArea() {
  return (
    <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <GraphMainAreaContent />
    </Suspense>
  );
}

function GraphMainAreaContent() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'graph';

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGraph()
      .then((data) => {
        setNodes(data.nodes);
        setEdges(data.edges);
      })
      .catch((err) => setError(err.message || 'Failed to load graph data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0988A' }}>
        Loading graph...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

      {/* Main Canvas/Table Area */}
      <div style={{
        flex: 1,
        transition: 'flex 0.3s ease-in-out',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {currentView === 'graph' ? (
          <InteractiveGraph
            nodes={nodes}
            edges={edges}
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        ) : (
          <GraphTableView
            nodes={nodes}
            edges={edges}
            onNodeSelect={setSelectedNodeId}
          />
        )}
      </div>

      {/* Slide-in Detail Panel */}
      {selectedNodeId && (
        <EntityDetailPanel
          entityId={selectedNodeId}
          nodes={nodes}
          edges={edges}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

    </div>
  );
}
