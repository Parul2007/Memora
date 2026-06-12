'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, ZoomIn, ZoomOut, Maximize2, Minimize2, Filter, Eye, EyeOff, Sliders, Info, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import useSWR from 'swr';
import { fetchGraph } from '../../services/graphService';

// ForceGraph2D must be dynamically imported with ssr: false
// because it relies on the window object (HTML5 Canvas).
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-[#78716c]">Loading Graph Engine...</div>
});

interface GraphNode {
  id: string;
  name: string;
  type: string;
  mentions: number;
  val: number;
  importance?: number;
  x?: number;
  y?: number;
  color?: string;
}

interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
  strength: number;
}

// Soft pastel palette — readable on dark canvas
const CATEGORY_COLORS: Record<string, string> = {
  person:       '#93C5FD', // pastel blue
  place:        '#6EE7B7', // pastel emerald
  organization: '#C4B5FD', // pastel violet
  date:         '#FCD34D', // pastel amber
  event:        '#FCA5A5', // pastel red
  product:      '#F9A8D4', // pastel pink
  concept:      '#5EEAD4', // pastel teal
  technology:   '#FDBA74', // pastel orange
  emotion:      '#F0ABFC', // pastel fuchsia
  goal:         '#BEF264', // pastel lime
  habit:        '#67E8F9', // pastel cyan
  preference:   '#FED7AA', // pastel peach
  topic:        '#DDD6FE', // pastel lavender
  relationship: '#FDA4AF', // pastel rose
  other:        '#A8A29E', // muted stone
};

// Labels the extractor produces that should map to a known graph category
const LABEL_ALIAS: Record<string, string> = {
  tech:         'technology',
  org:          'organization',
  loc:          'place',
  location:     'place',
  per:          'person',
  time:         'date',
  misc:         'other',
};
const EMPTY_ARRAY: any[] = [];

export default function InteractiveGraphView({ 
  onOpenEntity,
  isFullscreen = false,
  onToggleFullscreen
}: { 
  onOpenEntity: (id: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const fgRef = useRef<any>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  // Start at 0 — the ResizeObserver fires synchronously on the first observe
  // call (in modern browsers) so the canvas snaps to the real container size
  // before the first paint, eliminating the black-strip flash.
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Interaction and Filtering states
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [neighbors, setNeighbors] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(Object.keys(CATEGORY_COLORS))
  );


  const [minStrength, setMinStrength] = useState<number>(1);
  const [showLabels, setShowLabels] = useState<boolean>(true);


  const { data, error, isLoading } = useSWR<{ nodes: GraphNode[]; edges: GraphEdge[] }>('/api/graph', fetchGraph);

  const getMappedCategory = (type: string): string => {
    const key = (type || '').toLowerCase().trim();
    if (CATEGORY_COLORS[key]) return key;
    if (LABEL_ALIAS[key]) return LABEL_ALIAS[key];
    return 'other';
  };

  const getNodeColor = (type: string) => {
    const mapped = getMappedCategory(type);
    return CATEGORY_COLORS[mapped];
  };

  // Memoised so their references are stable across re-renders.
  // Without useMemo, any state update (e.g. setNeighbors) would recompute
  // these inline on every render, giving the useEffect below a new reference
  // each time and re-triggering it indefinitely.
  const safeNodes = useMemo(
    () => (Array.isArray(data?.nodes) ? data!.nodes : EMPTY_ARRAY),
    [data]
  );
  const safeEdges = useMemo(
    () => (Array.isArray(data?.edges) ? data!.edges : EMPTY_ARRAY),
    [data]
  );

  // Track window/container resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 800,
          height: entry.contentRect.height || 600
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Configure D3 forces — stronger repulsion + longer link distance so nodes
  // are already well spread when the simulation starts. warmupTicks runs the
  // physics headlessly before the first frame, so the graph never looks
  // clustered on initial render.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('link')?.distance(140);
    fg.d3Force('charge')?.strength(-600);
    fg.d3Force('collision')?.radius?.((node: any) => Math.max(18, node.val * 3));
    // Cool the simulation faster so it settles without bouncing
    fg.d3Force('center')?.strength(0.05);
  }, [data]);

  // Calculate degrees (connections count per node)
  const degrees = useMemo(() => {
    const degs: Record<string, number> = {};
    safeEdges.forEach((edge) => {
      const s = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
      const t = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;
      if (s) degs[s] = (degs[s] || 0) + 1;
      if (t) degs[t] = (degs[t] || 0) + 1;
    });
    return degs;
  }, [safeEdges]);

  // Compute neighbors when hoveredNode changes (Ego Network)
  useEffect(() => {
    if (!hoveredNode) {
      // Use a functional updater so we return the *same* Set instance when
      // it is already empty.  Unconditionally writing `new Set()` would always
      // produce a reference that fails Object.is(), scheduling another render,
      // which re-evaluates safeEdges, which re-fires this effect — infinite loop.
      setNeighbors(prev => (prev.size === 0 ? prev : new Set()));
      return;
    }
    const neighborSet = new Set<string>();
    safeEdges.forEach((edge) => {
      const sourceId = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
      const targetId = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;
      if (sourceId === hoveredNode.id) {
        neighborSet.add(targetId);
      } else if (targetId === hoveredNode.id) {
        neighborSet.add(sourceId);
      }
    });
    setNeighbors(neighborSet);
  }, [hoveredNode, safeEdges]);

  // Filter and format node & edge data
  const filteredData = useMemo(() => {
    const nodes = safeNodes.filter((n) => {
      const typeKey = getMappedCategory(n.type);
      


      // Checkbox legend check
      const hasCategory = selectedCategories.has(typeKey);
        
      return hasCategory;
    });

    const activeNodeIds = new Set(nodes.map(n => n.id));

    // Filter edges by strength and active nodes connection
    const links = safeEdges.filter((e) => {
      const sourceId = typeof e.source === 'object' ? (e.source as any).id : e.source;
      const targetId = typeof e.target === 'object' ? (e.target as any).id : e.target;
      const meetsStrength = (e.strength || 1) >= minStrength;
      return meetsStrength && activeNodeIds.has(sourceId) && activeNodeIds.has(targetId);
    });

    return { nodes, links };
  }, [safeNodes, safeEdges, selectedCategories, minStrength]);



  // Custom Node Canvas Renderer
  const drawNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHovered = hoveredNode && (hoveredNode.id === node.id || neighbors.has(node.id));
    const isTarget = hoveredNode && hoveredNode.id === node.id;
    
    // Sleek and professional node sizes (base 4 to 12 max) to prevent clumping
    const mentions = node.mentions || 1;
    const deg = degrees[node.id] || 0;
    const radius = Math.max(4.5, Math.min(13, 4.5 + Math.sqrt(mentions) * 0.5 + deg * 0.15));
    
    // Apply dimming opacity for unrelated elements
    const isDimmed = hoveredNode && !isHovered;
    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.20 : 1.0;
    
    // Draw outer highlight/hover ring
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + (isTarget ? 4.5 : 3), 0, 2 * Math.PI, false);
      ctx.fillStyle = isTarget ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      
      ctx.strokeStyle = getNodeColor(node.type);
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }
    
    // Draw solid node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node.type);
    ctx.fill();
    
    // Pastel nodes have a softer outline on dark bg
    ctx.strokeStyle = 'rgba(17,18,13,0.6)';
    ctx.lineWidth = 1.0 / globalScale;
    ctx.stroke();
    
    // Draw clean text with outline (no blocky pills)
    const canShowLabel = showLabels || globalScale > 1.2 || isHovered;
    if (canShowLabel) {
      const label = node.name || '';
      const fontSize = Math.max(8, Math.min(11, 9 / globalScale));
      ctx.font = `${isHovered ? '600' : '400'} ${fontSize}px system-ui, -apple-system, sans-serif`;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw text outline for legibility
      ctx.strokeStyle = 'rgba(17, 18, 13, 0.9)';
      ctx.lineWidth = 3 / globalScale;
      ctx.strokeText(label, node.x, node.y - radius - 6);
      
      // Draw text fill
      ctx.fillStyle = isHovered ? '#FFFFFF' : '#D6D3D1';
      ctx.fillText(label, node.x, node.y - radius - 6);
    }
    
    ctx.restore();
  };

  // Zoom manipulation functions
  const handleZoomIn = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.4, 300);
  const handleZoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() / 1.4, 300);
  const handleFitToScreen = () => fgRef.current?.zoomToFit(600, 30);
  const handleResetZoom = () => {
    fgRef.current?.centerAt(0, 0, 500);
    fgRef.current?.zoom(1.5, 500);
  };

  const handleCategoryToggle = (category: string) => {
    const nextSet = new Set(selectedCategories);
    if (nextSet.has(category)) {
      if (nextSet.size > 1) { // keep at least one category visible
        nextSet.delete(category);
      }
    } else {
      nextSet.add(category);
    }
    setSelectedCategories(nextSet);
  };



  const getLinkColor = (link: any) => {
    if (!hoveredNode) return '#2E2E2A';
    const s = typeof link.source === 'object' ? link.source.id : link.source;
    const t = typeof link.target === 'object' ? link.target.id : link.target;
    const connected = s === hoveredNode.id || t === hoveredNode.id;
    return connected ? '#3b82f6' : '#1C1917';
  };

  const getLinkWidth = (link: any) => {
    const base = Math.min(1.5, Math.max(0.25, link.strength / 4));
    if (!hoveredNode) return base;
    const s = typeof link.source === 'object' ? link.source.id : link.source;
    const t = typeof link.target === 'object' ? link.target.id : link.target;
    const connected = s === hoveredNode.id || t === hoveredNode.id;
    return connected ? base * 1.6 : base * 0.4;
  };

  // Render UX States (Loading, Error, Empty)
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#11120D] text-stone-400 gap-3">
        <RefreshCw className="animate-spin text-[#A0988A]" size={28} />
        <p className="text-sm font-semibold tracking-wide">Constructing Memory Vault Connections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#11120D] text-stone-400 p-8 text-center max-w-md mx-auto">
        <AlertCircle className="text-red-500 mb-4 animate-pulse" size={48} />
        <h3 className="font-serif text-lg font-semibold text-white mb-2">Failed to Load Graph</h3>
        <p className="text-xs text-stone-500 leading-relaxed mb-4">
          Could not establish connection to the database. Ensure Neo4j is running and retry.
        </p>
      </div>
    );
  }

  if (safeNodes.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#11120D] text-stone-400 p-8 text-center max-w-md mx-auto">
        <Info className="text-stone-600 mb-4" size={48} />
        <h3 className="font-serif text-lg font-semibold text-white mb-2">Empty Knowledge Graph</h3>
        <p className="text-xs text-stone-500 leading-relaxed mb-4">
          No concepts or connections are currently extracted. Interact in the chat tab to log experiences and generate entities!
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full bg-[#11120D] overflow-hidden select-none">
      {/* Left Sidebar Legend */}
      <div className={`flex flex-col bg-stone-950 border-r border-stone-800 transition-all duration-300 z-20 shadow-xl ${isLegendOpen ? 'w-56' : 'w-12'}`}>
        <div className={`flex items-center p-3 border-b border-stone-800 ${isLegendOpen ? 'justify-between' : 'justify-center'}`}>
          {isLegendOpen && <span className="text-[#A0988A] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5"><Filter size={12} /> Legend</span>}
          <button 
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="text-stone-400 hover:text-white p-1 rounded-md hover:bg-stone-800 transition-colors"
            title={isLegendOpen ? "Collapse Legend" : "Expand Legend"}
          >
            {isLegendOpen ? <ChevronLeft size={16} /> : <Filter size={16} />}
          </button>
        </div>

        {isLegendOpen && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Category Filter */}
            <div className="space-y-3">
              <span className="text-[#A0988A] font-semibold text-[10px] uppercase tracking-wider">Visible Types</span>
              <div className="flex flex-col gap-2">
                {Object.keys(CATEGORY_COLORS).filter(c => c !== 'other').map((cat) => {
                  const active = selectedCategories.has(cat);
                  const color = CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryToggle(cat)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
                        active 
                          ? 'bg-stone-800 border-stone-700 text-stone-100' 
                          : 'bg-transparent border-stone-800/40 text-stone-500 hover:text-stone-400 hover:border-stone-600'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="capitalize font-medium text-xs">{cat.toLowerCase()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full h-px bg-stone-800" />

            {/* Relationship strength slider */}
            <div className="space-y-3">
              <span className="flex items-center justify-between text-[#A0988A] font-semibold text-[10px] uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><Sliders size={12} /> Min Strength</span>
                <span className="text-white bg-stone-800 font-medium px-1.5 py-0.5 rounded text-[10px]">{minStrength}</span>
              </span>
              <input
                type="range"
                min="1"
                max="10"
                value={minStrength}
                onChange={(e) => setMinStrength(parseInt(e.target.value))}
                className="w-full accent-stone-200 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 relative w-full overflow-hidden">

      {/* Top Right: Quick View Control Actions */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <div className="flex bg-stone-900/90 border border-stone-800 rounded-xl p-1 shadow-lg backdrop-blur-md">
          <button 
            onClick={() => setShowLabels(!showLabels)} 
            title={showLabels ? "Hide Labels" : "Show Labels"}
            className={`p-2 rounded-lg transition-colors ${showLabels ? 'text-white bg-stone-800' : 'text-stone-400 hover:text-white'}`}
          >
            {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          
          <div className="w-[1px] bg-stone-800 my-1 mx-1"></div>
          
          <button onClick={handleZoomIn} title="Zoom In" className="p-2 text-stone-400 hover:text-white rounded-lg transition-colors">
            <ZoomIn size={16} />
          </button>
          <button onClick={handleZoomOut} title="Zoom Out" className="p-2 text-stone-400 hover:text-white rounded-lg transition-colors">
            <ZoomOut size={16} />
          </button>
          <button 
            onClick={() => {
              if (onToggleFullscreen) onToggleFullscreen();
            }} 
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} 
            className="p-2 text-stone-400 hover:text-white rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={handleResetZoom} title="Reset View" className="p-2 text-stone-400 hover:text-white rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>



      {/* Main Force Graph Canvas — width/height driven by the flex container
           so it always fills 100% with no black strip */}
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width || undefined}
        height={dimensions.height || undefined}
        graphData={filteredData}
        
        // Sizing & styling
        nodeCanvasObject={drawNode}
        nodeRelSize={6}
        onNodeHover={(node: any) => setHoveredNode(node)}
        
        // Collision / Physics node Val sizing
        nodeVal={(node: any) => Math.max(1, (node.mentions || 1) + (degrees[node.id] || 0))}
        
        // Link customizations
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkLabel={(link: any) => {
          const sourceName = typeof link.source === 'object' ? link.source.name : link.source;
          const targetName = typeof link.target === 'object' ? link.target.name : link.target;
          const strength = link.strength ? ` (Strength: ${link.strength})` : '';
          return `
            <div style="background: rgba(28, 25, 23, 0.95); border: 1px solid rgba(120, 113, 108, 0.3); color: #FAFAF9; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-family: sans-serif; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); pointer-events: none;">
              <span style="font-weight: 600; color: #FFF;">${sourceName}</span>
              <span style="color: #A0988A; margin: 0 6px;">${link.label || 'connected'}</span>
              <span style="font-weight: 600; color: #FFF;">${targetName}</span>
              <span style="color: #fbbf24; font-family: monospace; margin-left: 4px;">${strength}</span>
            </div>
          `;
        }}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={(link: any) => {
          if (!hoveredNode) return 0;
          const s = typeof link.source === 'object' ? link.source.id : link.source;
          const t = typeof link.target === 'object' ? link.target.id : link.target;
          return (s === hoveredNode.id || t === hoveredNode.id) ? 1.5 : 0;
        }}
        linkDirectionalParticleSpeed={(link: any) => (link.strength || 1) * 0.005}
        
        // Click action zoom-focus
        onNodeClick={(node: any) => {
          fgRef.current?.centerAt(node.x, node.y, 1000);
          fgRef.current?.zoom(3.5, 1000);
          onOpenEntity(node.id);
        }}
        d3VelocityDecay={0.35}
        // Run 200 ticks headlessly before the first frame → graph is already
        // spread out when it first appears, never clustered.
        warmupTicks={200}
        cooldownTicks={80}
        // After the engine settles, fit everything neatly into view
        onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
      />
      </div>
    </div>
  );
}
