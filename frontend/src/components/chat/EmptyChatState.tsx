import React from 'react';
import { CognitiveNavigation } from './CognitiveBlocks';

const SUGGESTIONS = [
  "What do you remember about my career goals?",
  "How have I been feeling lately?",
  "What milestones am I close to completing?"
];

const NEW_USER_SUGGESTIONS = [
  "How can I set up my memory?",
  "Who are you and what can you do?",
  "What is the Knowledge Graph?"
];

export default function EmptyChatState({ userName, isNewUser = false, onSuggestionClick }: { userName: string, isNewUser?: boolean, onSuggestionClick: (text: string) => void }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const suggestions = isNewUser ? NEW_USER_SUGGESTIONS : SUGGESTIONS;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 40px 24px', overflowY: 'auto', minHeight: 0 }}>
      <div style={{ maxWidth: '800px', width: '100%', textAlign: 'center', margin: 'auto' }}>
        <h2 style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', color: '#11120D', margin: '0 0 8px 0' }}>
          {getGreeting()}, {userName || 'there'}
        </h2>
        <p style={{ fontSize: '15px', color: '#565449', margin: '0 0 24px 0' }}>
          {isNewUser ? "Seems like I don't know anything about you. Wanna tell me something? Let's chat!" : "What's on your mind?"}
        </p>

        {/* Quick Navigation to key sections */}
        <div style={{ marginBottom: '24px' }}>
          <CognitiveNavigation />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(s)}
              style={{
                backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '12px',
                padding: '16px', textAlign: 'left', cursor: 'pointer',
                color: '#166534', fontSize: '13px', lineHeight: 1.4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#bbf7d0'; e.currentTarget.style.borderColor = '#86efac'; e.currentTarget.style.color = '#14532d'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dcfce7'; e.currentTarget.style.borderColor = '#bbf7d0'; e.currentTarget.style.color = '#166534'; }}
            >
              {s}
            </button>
          ))}
        </div>


      </div>
    </div>
  );
}
