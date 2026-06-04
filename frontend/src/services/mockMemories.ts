export interface MemoryData {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural' | 'emotional';
  content: string;
  source: 'Memora' | 'ChatGPT' | 'Claude' | 'Gemini' | 'Manual';
  timestamp: string;
  dateObj: Date;
  pinned: boolean;
  importance: number; // 0.0 to 1.0
  decayFactor: number; // 0.0 to 1.0 (high decay = fading/weak)
  accessed: number;
  tags: string[];
}

export const MOCK_MEMORIES: MemoryData[] = [
  {
    id: 'm1', type: 'episodic', 
    content: 'Had a breakthrough conversation about shifting career focus entirely to AI architecture. Felt highly energized.',
    source: 'Memora', timestamp: 'Today', dateObj: new Date(), pinned: true,
    importance: 0.92, decayFactor: 0.1, accessed: 14, tags: ['career', 'ai', 'goals']
  },
  {
    id: 'm2', type: 'semantic', 
    content: 'Prefers reading documentation over watching video tutorials for learning new coding frameworks.',
    source: 'ChatGPT', timestamp: '2 days ago', dateObj: new Date(Date.now() - 2 * 86400000), pinned: false,
    importance: 0.65, decayFactor: 0.3, accessed: 4, tags: ['learning', 'preferences']
  },
  {
    id: 'm3', type: 'emotional', 
    content: 'Expressed significant anxiety regarding the upcoming Q3 product launch timeline.',
    source: 'Memora', timestamp: 'Last week', dateObj: new Date(Date.now() - 7 * 86400000), pinned: false,
    importance: 0.85, decayFactor: 0.8, accessed: 1, tags: ['work', 'stress', 'Q3']
  },
  {
    id: 'm4', type: 'procedural', 
    content: 'Morning routine: Meditate for 10 mins, coffee, write 3 daily goals before checking email.',
    source: 'Manual', timestamp: 'Last month', dateObj: new Date(Date.now() - 30 * 86400000), pinned: true,
    importance: 0.78, decayFactor: 0.2, accessed: 42, tags: ['habits', 'morning']
  },
  {
    id: 'm5', type: 'semantic', 
    content: 'User\'s primary programming language is TypeScript, moving into Python for AI work.',
    source: 'Claude', timestamp: '2 months ago', dateObj: new Date(Date.now() - 60 * 86400000), pinned: false,
    importance: 0.55, decayFactor: 0.9, accessed: 0, tags: ['skills', 'typescript', 'python']
  }
];

export const getHealth = (decayFactor: number) => {
  if (decayFactor < 0.3) return { label: 'Strong', color: '#16a34a' }; // Green
  if (decayFactor < 0.7) return { label: 'Fading', color: '#d97706' }; // Amber
  return { label: 'Weak', color: '#be185d' }; // Rose
};
