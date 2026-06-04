export interface Session {
  id: string;
  title: string;
  time: string;
  group: 'Today' | 'Yesterday' | 'This week' | 'Older';
  memories: number;
  starred: boolean;
  is_archived?: boolean;
  started_at?: string;
  loadingTitle?: boolean;
}


export enum StreamState {
  IDLE = 'IDLE',
  RETRIEVING = 'RETRIEVING',
  THINKING = 'THINKING',
  GENERATING = 'GENERATING',
  REFLECTING = 'REFLECTING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: string;
  thinking?: {
    phase: string;
    duration?: number;
    memoriesUsed?: number;
  };
  tokens?: number;
  duration?: number;
  memories?: MemoryItem[];
  feedback?: 'up' | 'down' | null;
  edited?: boolean;
  attachments?: any[];
  timestamp: string;
  createdAt?: string;
  isError?: boolean;
  metadata?: any;
}

export interface MemoryItem {
  id: string;
  type: 'episodic' | 'semantic' | 'emotional' | 'procedural';
  memory_type?: string;
  content: string;
  relevance: number;
  source: 'Memora' | 'ChatGPT' | 'Claude' | 'Gemini';
  explanation: string;
  created_at?: string;
  expires_at?: string | null;
  decay_factor?: number;
  importance_score?: number;
  emotional_weight?: number;
  is_consolidated?: boolean;
  times_used?: number;
  metadata?: {
    extracted_live?: boolean;
    session_id?: string;
    importance_score?: number;
    [key: string]: any;
  };
  duplicateOf?: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  status: 'completed' | 'at risk' | 'pending' | 'overdue';
}

export interface Goal {
  id: string;
  title: string;
  priority: 'HIGH' | 'MED' | 'LOW';
  status: string;
  progress: number;
  dueDate: string;
  createdAt: string;
  description: string;
  milestones: Milestone[];
  linkedHabits: string[];
  linkedMemoriesCount: number;
  lastUpdated: string;
}

export interface Habit {
  id: string;
  title: string;
  frequency: string;
  insight: string;
  triggers: string[];
  sentiment: 'positive' | 'negative' | 'mixed';
  memoriesLinked: number;
}
