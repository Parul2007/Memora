// ==========================================
// MOCK EXTENSION API
// ==========================================

export async function getExtensionStatus() {
  return new Promise(resolve => setTimeout(() => resolve({
    installed: true,
    version: 'v1.0.2',
    lastSync: '2 minutes ago',
    globalPause: false
  }), 300));
}

export async function getExtensionStats() {
  return new Promise(resolve => setTimeout(() => resolve({
    totalIngested: 832,
    conversationsProcessed: 247,
    duplicatesSkipped: 41,
    platforms: {
      chatgpt: { count: 524, share: 0.63, active: true, lastActive: '3 hours ago', thisWeek: 18 },
      claude: { count: 198, share: 0.24, active: true, lastActive: 'Yesterday', thisWeek: 12 },
      gemini: { count: 87, share: 0.10, active: false, lastActive: '4 days ago', thisWeek: 0 },
      manual: { count: 23, share: 0.03 }
    }
  }), 400));
}

export async function getExtensionActivity(filters?: any) {
  return new Promise(resolve => setTimeout(() => resolve([
    { id: 1, platform: 'chatgpt', date: 'Mar 14, 2025 2:41 PM', status: 'saved', memories: ['Episodic', 'Semantic', 'Emotional'], preview: "You: I've been thinking about changing careers...", quality: 'High', entities: ['Career change', 'Software engineering'] },
    { id: 2, platform: 'claude', date: 'Mar 14, 2025 11:15 AM', status: 'saved', memories: ['Semantic'], preview: "You: Explain how the React reconciliation algorithm works.", quality: 'Medium', entities: ['React', 'Algorithms'] },
    { id: 3, platform: 'chatgpt', date: 'Mar 13, 2025 9:02 PM', status: 'duplicate', memories: [], preview: "You: I've been thinking about changing careers...", quality: 'Low', entities: [] },
    { id: 4, platform: 'gemini', date: 'Mar 12, 2025 4:30 PM', status: 'failed', reason: 'Auth expired', preview: "You: Summarize this PDF...", quality: 'Low', entities: [] }
  ]), 500));
}

export async function updateExtensionSettings(settings: any) {
  return new Promise(resolve => setTimeout(() => resolve({ success: true }), 200));
}

export async function manualCapture(content: string, type: string, source: string) {
  return new Promise(resolve => setTimeout(() => resolve({ success: true, id: Date.now() }), 600));
}
