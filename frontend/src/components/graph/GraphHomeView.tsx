import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import InteractiveGraphView from './InteractiveGraphView';
import { Network, TrendingUp, Link as LinkIcon, Database, BarChart3, HelpCircle, Activity, RefreshCw, Info } from 'lucide-react';
import useSWR from 'swr';
import { apiFetch } from '../../services/apiClient';

interface GraphOverview {
  total_entities: number;
  total_relationships: number;
  strongest_entity: { name: string; mentions: number };
  emerging_entities: Array<{ name: string; growth_score: number }>;
  strongest_relationships: Array<{ source: string; target: string; strength: number }>;
}

export default function GraphHomeView({ onOpenEntity }: { onOpenEntity: (id: string) => void }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fetcher = (url: string) => apiFetch<any>(url);
  const { data: overview, isLoading: overviewLoading } = useSWR<GraphOverview>('/api/graph/overview', fetcher);
  const { data: graphData, isLoading: graphLoading } = useSWR<{ nodes: any[]; edges: any[] }>('/api/graph/', fetcher);



  const stats = useMemo(() => {
    if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
      return {
        topConnected: [],
        averageDegree: 0,
        typeBreakdown: {} as Record<string, number>,
        relationshipBreakdown: {} as Record<string, number>,
        strongestCluster: 'None',
        clusterCounts: {} as Record<string, number>
      };
    }

    const nodes = graphData.nodes;
    const edges = graphData.edges;

    // 1. Calculate degrees (connections count per node)
    const degrees: Record<string, number> = {};
    edges.forEach((edge) => {
      const s = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
      const t = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;
      if (s) degrees[s] = (degrees[s] || 0) + 1;
      if (t) degrees[t] = (degrees[t] || 0) + 1;
    });

    // 2. Average degree (2 * edges / nodes)
    const averageDegree = nodes.length > 0 ? parseFloat((2 * edges.length / nodes.length).toFixed(2)) : 0;

    // 3. Top 5 connected nodes
    const topConnected = [...nodes]
      .map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        degree: degrees[n.id] || 0,
        mentions: n.mentions || 0
      }))
      .sort((a, b) => b.degree - a.degree || b.mentions - a.mentions)
      .slice(0, 5);

    // 4. Type breakdown
    const typeBreakdown: Record<string, number> = {};
    nodes.forEach(n => {
      const type = n.type ? n.type.toUpperCase() : 'CONCEPT';
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    // 5. Relationship type breakdown
    const relationshipBreakdown: Record<string, number> = {};
    edges.forEach(e => {
      const label = e.label ? e.label.toUpperCase() : 'RELATED_TO';
      relationshipBreakdown[label] = (relationshipBreakdown[label] || 0) + 1;
    });

    // 6. Heuristic Clustering
    const clusterKeywords = {
      'Programming': ['python', 'react', 'javascript', 'programming', 'code', 'coding', 'rust', 'typescript', 'frontend', 'backend', 'developer', 'git', 'web', 'next.js', 'vue', 'html', 'css'],
      'AI Research': ['ai', 'machine learning', 'ml', 'neural', 'model', 'llm', 'intelligence', 'gpt', 'deep learning', 'nlp', 'transformers', 'gemini', 'openai', 'prompt'],
      'Health': ['health', 'diet', 'gym', 'workout', 'fitness', 'sleep', 'running', 'meditation', 'exercise', 'nutrition', 'water', 'habit', 'cardio'],
      'Career': ['career', 'job', 'work', 'resume', 'interview', 'business', 'meeting', 'office', 'project', 'client', 'salary', 'resume', 'hire'],
      'Education': ['education', 'study', 'learn', 'course', 'college', 'university', 'book', 'reading', 'class', 'exam', 'paper', 'research', 'math']
    };

    const clusterCounts: Record<string, number> = {};
    nodes.forEach(n => {
      const nameLower = (n.name || '').toLowerCase();
      let matched = false;
      for (const [cluster, keywords] of Object.entries(clusterKeywords)) {
        if (keywords.some(kw => nameLower.includes(kw))) {
          clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const type = n.type ? n.type.toUpperCase() : 'CONCEPT';
        if (type === 'PERSON') {
          clusterCounts['Social'] = (clusterCounts['Social'] || 0) + 1;
        } else {
          clusterCounts['General'] = (clusterCounts['General'] || 0) + 1;
        }
      }
    });

    const strongestCluster = Object.entries(clusterCounts)
      .filter(([cluster]) => cluster !== 'General')
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'AI & Programming';

    return { topConnected, averageDegree, typeBreakdown, relationshipBreakdown, strongestCluster, clusterCounts };
  }, [graphData]);

  const loading = overviewLoading || graphLoading;

  return (
    <div className="flex min-h-0 h-full w-full overflow-hidden bg-[#FAFAF9]">
      
      {/* Left Column: Main Interactive Graph */}
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden relative">
        <div className="px-5 py-3 border-b border-[#e7e5e4] bg-white z-10 flex-shrink-0 flex flex-wrap justify-between items-center gap-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-serif font-semibold text-[#11120D]">Knowledge Graph</h1>
            <div className="w-px h-4 bg-[#e7e5e4] hidden sm:block"></div>
            <p className="text-[11px] text-[#78716c] hidden sm:block">Visual intelligence mapping of your concepts and relationships.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#565449]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span><strong>{overview?.total_entities || 0}</strong> entities</span>
            </div>
            <div className="w-px h-3 bg-[#e7e5e4] hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span><strong>{overview?.total_relationships || 0}</strong> relationships</span>
            </div>
            <div className="w-px h-3 bg-[#e7e5e4] hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <span>Cluster: <strong className="text-[#11120D]">{stats.strongestCluster}</strong></span>
            </div>
            <div className="w-px h-3 bg-[#e7e5e4] hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Most connected: <span className="font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => stats.topConnected[0] && onOpenEntity(stats.topConnected[0].name)}>{stats.topConnected[0]?.name || 'N/A'}</span></span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative bg-[#FAFAF9] p-4">
          <div className={`shadow-sm flex flex-col bg-[#11120D] transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100] rounded-none border-0' : 'w-full h-full rounded-2xl overflow-hidden border border-[#e7e5e4]'}`}>
            <InteractiveGraphView 
              onOpenEntity={onOpenEntity}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Analytics & Insights Sidebar */}
      <div className="w-80 border-l border-[#e7e5e4] bg-white flex flex-col min-h-0 h-full overflow-hidden flex-shrink-0">
        
        {/* Sidebar Header */}
        <div className="px-5 py-4 border-b border-[#e7e5e4] bg-[#FAFAF9] flex-shrink-0 flex items-center gap-2">
          <BarChart3 size={16} className="text-[#11120D]" />
          <h2 className="font-serif text-base font-semibold text-[#11120D]">Graph Intelligence</h2>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-24 bg-[#F0EFEA] rounded-xl" />
              <div className="h-48 bg-[#F0EFEA] rounded-xl" />
              <div className="h-40 bg-[#F0EFEA] rounded-xl" />
            </div>
          ) : (
            <>
              {/* Overview Metrics Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#FAFAF9] border border-[#e7e5e4] rounded-xl">
                  <span className="text-[9px] font-bold text-[#A0988A] uppercase tracking-wider block mb-0.5">Total Concepts</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-[#11120D]">{overview?.total_entities || 0}</span>
                    <span className="text-[9px] text-[#78716c]">nodes</span>
                  </div>
                </div>
                <div className="p-3 bg-[#FAFAF9] border border-[#e7e5e4] rounded-xl">
                  <span className="text-[9px] font-bold text-[#A0988A] uppercase tracking-wider block mb-0.5">Connections</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-[#11120D]">{overview?.total_relationships || 0}</span>
                    <span className="text-[9px] text-[#78716c]">edges</span>
                  </div>
                </div>
              </div>

              {/* Entity Type Breakdown */}
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold text-[#A0988A] uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={12} /> Entity Breakdown
                </h3>
                <div className="bg-[#FAFAF9] border border-[#e7e5e4] rounded-xl p-3 space-y-1.5">
                  {Object.keys(stats.typeBreakdown).length > 0 ? (
                    Object.entries(stats.typeBreakdown).map(([type, count]) => {
                      const percentage = Math.round((count / (overview?.total_entities || 1)) * 100);
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span className="capitalize text-[#565449]">{type.toLowerCase()}</span>
                            <span className="text-[#11120D]">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-[#E7E5E4] h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-stone-800 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[11px] text-[#78716c] italic">No active entities detected.</div>
                  )}
                </div>
              </div>

              {/* Top 5 Connected Entities */}
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold text-[#A0988A] uppercase tracking-wider flex items-center gap-1.5">
                  <Network size={12} /> Top Connected Entities
                </h3>
                <div className="border border-[#e7e5e4] rounded-xl divide-y divide-[#e7e5e4] bg-white overflow-hidden">
                  {stats.topConnected.length > 0 ? (
                    stats.topConnected.map((node) => (
                      <div 
                        key={node.id}
                        onClick={() => onOpenEntity(node.name)}
                        className="px-3 py-1.5 hover:bg-[#FAFAF9] cursor-pointer flex justify-between items-center transition-colors group"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-[#11120D] truncate group-hover:text-blue-600 transition-colors">
                            {node.name}
                          </span>
                          <span className="text-[9px] text-[#A0988A] capitalize">
                            {node.type.toLowerCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F0EFEA] text-[#565449] font-medium">
                            {node.degree} links
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3.5 text-xs text-[#78716c] italic">No connections structured yet.</div>
                  )}
                </div>
              </div>

              {/* Connection Density Card */}
              <div className="p-3 bg-[#FAFAF9] border border-[#e7e5e4] rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#A0988A] uppercase tracking-wider">
                  <LinkIcon size={12} /> Connection Density
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-[#11120D]">{stats.averageDegree}</span>
                  <span className="text-[11px] text-[#78716c]">average links / node</span>
                </div>
                <p className="text-[9px] text-[#A0988A] leading-relaxed">
                  Higher numbers indicate a highly interconnected network of conceptual memories, showing cross-domain thought correlation.
                </p>
              </div>


            </>
          )}

        </div>
      </div>

    </div>
  );
}
