import React from 'react';

const SUGGESTIONS = [
  "What do you remember about my career goals?",
  "How have I been feeling lately?",
  "What milestones am I close to completing?"
];

const NEW_USER_SUGGESTIONS = [
  "How can I set up my memory?",
  "How does the Extension Hub work?"
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '800px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', color: '#11120D', margin: '0 0 8px 0' }}>
          {getGreeting()}, {userName || 'there'}
        </h2>
        <p style={{ fontSize: '15px', color: '#565449', margin: '0 0 24px 0' }}>
          {isNewUser ? "Seems like I don't know anything about you. Wanna tell me something? Let's chat!" : "What's on your mind?"}
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(s)}
              style={{
                backgroundColor: '#FFFBF4', border: '1px solid #e7e5e4', borderRadius: '12px',
                padding: '16px', textAlign: 'left', cursor: 'pointer',
                color: '#565449', fontSize: '13px', lineHeight: 1.4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#A0988A'; e.currentTarget.style.color = '#11120D'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFBF4'; e.currentTarget.style.borderColor = '#e7e5e4'; e.currentTarget.style.color = '#565449'; }}
            >
              {s}
            </button>
          ))}
        </div>

        {isNewUser && (
          <div style={{ marginTop: '32px', padding: '16px 24px', backgroundColor: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', color: '#166534', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '14px' }}>Want to Sync your Past Memories? Or want us to Help you with the New Ones !</div>
              <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>No Worries We Got You !</div>
              <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5, opacity: 0.9 }}>
                Install our Browser Extension to passively build your Vault as you Chat with other AI tools. Interesting, right!
              </p>
            </div>
            <a href="/extension-hub" style={{ flexShrink: 0, padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '13px', display: 'inline-block' }}>
              Extension Hub
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
