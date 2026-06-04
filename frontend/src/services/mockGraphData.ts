export interface GraphNode {
  id: string;
  name: string;
  type: 'person' | 'place' | 'org' | 'concept' | 'goal' | 'event' | 'habit';
  val: number; // For node sizing in force graph
  mentions: number;
  firstSeen: string;
  lastSeen: string;
}

export interface GraphEdge {
  id: string;
  source: string; // Must be "source" for force graph
  target: string; // Must be "target" for force graph
  strength: number; 
  label: string;
}

export const MOCK_NODES: GraphNode[] = [
  { id: 'n1', name: 'Alex', type: 'person', val: 4, mentions: 47, firstSeen: 'Jan 12, 2025', lastSeen: 'Today' },
  { id: 'n2', name: 'Berlin', type: 'place', val: 2.5, mentions: 23, firstSeen: 'Feb 4, 2025', lastSeen: '2 days ago' },
  { id: 'n3', name: 'Startup', type: 'org', val: 2, mentions: 18, firstSeen: 'Dec 1, 2024', lastSeen: 'Yesterday' },
  { id: 'n4', name: 'Anxiety', type: 'concept', val: 7, mentions: 91, firstSeen: 'Nov 15, 2024', lastSeen: 'Today' },
  { id: 'n5', name: 'Fitness', type: 'habit', val: 2.2, mentions: 19, firstSeen: 'Jan 1, 2025', lastSeen: 'Today' },
  { id: 'n6', name: 'Q3 Launch', type: 'event', val: 3.5, mentions: 34, firstSeen: 'Mar 10, 2025', lastSeen: 'Last week' },
  { id: 'n7', name: 'Become TPM', type: 'goal', val: 1.5, mentions: 12, firstSeen: 'Feb 20, 2025', lastSeen: 'Today' },
];

export const MOCK_EDGES: GraphEdge[] = [
  { id: 'e1', source: 'n1', target: 'n2', strength: 3, label: 'Lived in' },
  { id: 'e2', source: 'n1', target: 'n3', strength: 5, label: 'Founded' },
  { id: 'e3', source: 'n1', target: 'n4', strength: 4, label: 'Experiences' },
  { id: 'e4', source: 'n1', target: 'n7', strength: 5, label: 'Pursuing' },
  { id: 'e5', source: 'n3', target: 'n6', strength: 4, label: 'Milestone' },
  { id: 'e6', source: 'n4', target: 'n6', strength: 2, label: 'Triggered by' },
  { id: 'e7', source: 'n1', target: 'n5', strength: 3, label: 'Maintains' },
];
