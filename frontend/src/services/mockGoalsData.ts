export const MOCK_GOALS = [
  {
    id: 'g1',
    title: 'Finish building Memora MVP',
    priority: 'HIGH',
    status: 'On track',
    progress: 72,
    dueDate: '18 days',
    createdAt: '2025-01-15',
    description: 'Launch the first production version of Memora by end of quarter',
    milestones: [
      { id: 'm1', title: 'Backend API complete', date: 'Mar 5', status: 'completed' },
      { id: 'm2', title: 'Memory vault working', date: 'Mar 8', status: 'completed' },
      { id: 'm3', title: 'Frontend MVP shipped', date: 'Mar 20', status: 'at risk' },
      { id: 'm4', title: 'Chrome extension live', date: 'Mar 25', status: 'pending' },
      { id: 'm5', title: 'First 100 users', date: 'Mar 31', status: 'pending' },
    ],
    linkedHabits: ['Late-night coding sessions', 'Daily commits', 'Skipping lunch'],
    linkedMemoriesCount: 2,
    lastUpdated: '2 days ago'
  },
  {
    id: 'g2',
    title: 'Marathon Training',
    priority: 'MED',
    status: 'Overdue',
    progress: 45,
    dueDate: 'Overdue by 3 days',
    createdAt: '2025-02-01',
    description: 'Run the city marathon without stopping.',
    milestones: [
      { id: 'm6', title: '10k run continuous', date: 'Feb 20', status: 'completed' },
      { id: 'm7', title: 'Half-marathon distance', date: 'Mar 10', status: 'completed' },
      { id: 'm8', title: '30k long run', date: 'Mar 25', status: 'overdue' },
    ],
    linkedHabits: ['Morning runs', 'Skipping stretching', 'Early bedtimes'],
    linkedMemoriesCount: 5,
    lastUpdated: '1 week ago'
  }
];

export const MOCK_HABITS = [
  {
    id: 'h1',
    title: 'Late-night coding sessions',
    frequency: '4x / week',
    insight: 'You tend to write most of your core system logic between 11PM and 2AM.',
    triggers: ['Deadline approaching', 'Coffee after 6PM'],
    sentiment: 'mixed', // mixed, positive, negative
    memoriesLinked: 12
  },
  {
    id: 'h2',
    title: 'Skipping lunch when stressed',
    frequency: '2x / week',
    insight: 'When your Claude chats mention "urgent" or "blocked", you often follow up with complaints about hunger later.',
    triggers: ['Work stress', 'Complex debugging'],
    sentiment: 'negative',
    memoriesLinked: 8
  },
  {
    id: 'h3',
    title: 'Daily commits',
    frequency: 'Daily',
    insight: 'You have consistently pushed code every day for the last 3 weeks.',
    triggers: ['Morning routine', 'Accountability goal'],
    sentiment: 'positive',
    memoriesLinked: 21
  }
];
