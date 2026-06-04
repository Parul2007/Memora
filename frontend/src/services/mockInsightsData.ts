export const MOCK_ACTIVITY_DATA = [
  { date: 'Mar 10', episodic: 4, semantic: 2, procedural: 1, emotional: 3 },
  { date: 'Mar 11', episodic: 2, semantic: 5, procedural: 0, emotional: 1 },
  { date: 'Mar 12', episodic: 7, semantic: 1, procedural: 2, emotional: 4 },
  { date: 'Mar 13', episodic: 3, semantic: 3, procedural: 4, emotional: 2 },
  { date: 'Mar 14', episodic: 5, semantic: 4, procedural: 1, emotional: 5 },
  { date: 'Mar 15', episodic: 1, semantic: 2, procedural: 0, emotional: 1 },
  { date: 'Mar 16', episodic: 6, semantic: 3, procedural: 2, emotional: 4 },
];

export const MOCK_EMOTIONAL_DATA = [
  { date: 'Mar 10', sentiment: 0.2, trigger: 'Normal day' },
  { date: 'Mar 11', sentiment: 0.6, trigger: 'Great progress on project' },
  { date: 'Mar 12', sentiment: -0.4, trigger: 'Frustrated with bug' },
  { date: 'Mar 13', sentiment: -0.1, trigger: 'Tired' },
  { date: 'Mar 14', sentiment: 0.8, trigger: 'Shipped feature' },
  { date: 'Mar 15', sentiment: 0.3, trigger: 'Relaxing weekend' },
  { date: 'Mar 16', sentiment: 0.5, trigger: 'Good planning session' },
];

export const MOCK_HEALTH_DATA = [
  { name: 'Strong', value: 450, color: '#22c55e' },
  { name: 'Fading', value: 120, color: '#f59e0b' },
  { name: 'Weak', value: 45, color: '#ef4444' }
];

export const MOCK_ENTITIES = [
  { id: 1, name: 'React', type: 'Concept', mentions: 145, firstSeen: 'Jan 15', lastSeen: 'Today', connections: 24 },
  { id: 2, name: 'Memora MVP', type: 'Project', mentions: 89, firstSeen: 'Feb 1', lastSeen: 'Today', connections: 18 },
  { id: 3, name: 'Sarah', type: 'Person', mentions: 56, firstSeen: 'Jan 10', lastSeen: 'Yesterday', connections: 12 },
  { id: 4, name: 'Late Night Coding', type: 'Habit', mentions: 42, firstSeen: 'Feb 15', lastSeen: 'Mar 14', connections: 8 },
  { id: 5, name: 'System Design', type: 'Concept', mentions: 38, firstSeen: 'Jan 22', lastSeen: 'Mar 12', connections: 15 },
];

export const MOCK_WEAK_MEMORIES = [
  { id: 1, preview: "The database schema for the new auth module needs to include...", type: 'Semantic', importance: 'High', decay: '85%' },
  { id: 2, preview: "Sarah mentioned she prefers meeting on Thursdays because...", type: 'Episodic', importance: 'Medium', decay: '90%' },
  { id: 3, preview: "To fix the Docker build caching issue, you must...", type: 'Procedural', importance: 'High', decay: '82%' },
];
