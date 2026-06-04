import React from 'react';
import { Bot, Zap, MessageSquare } from 'lucide-react';

export default function ActivityCalendar() {
  const events = [
    { id: 1, time: '10 mins ago', title: 'Captured from ChatGPT', detail: 'Discussed Python async/await patterns', icon: <Bot size={14} color="#0284c7" />, bgColor: '#e0f2fe' },
    { id: 2, time: '2 hours ago', title: 'Captured from Claude', detail: 'Reviewed email drafting for new clients', icon: <MessageSquare size={14} color="#166534" />, bgColor: '#dcfce7' },
    { id: 3, time: '5 hours ago', title: 'Manual Entry', detail: 'Saved a quote from a blog post', icon: <Zap size={14} color="#a16207" />, bgColor: '#fef08a' },
    { id: 4, time: 'Yesterday', title: 'Captured from ChatGPT', detail: 'Debugging Docker network issues', icon: <Bot size={14} color="#0284c7" />, bgColor: '#e0f2fe' },
    { id: 5, time: 'Yesterday', title: 'Captured from Claude', detail: 'Brainstorming marketing ideas', icon: <MessageSquare size={14} color="#166534" />, bgColor: '#dcfce7' },
  ];

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '12px', padding: '24px' }}>
      <div style={{ position: 'relative' }}>
        {/* Vertical connecting line */}
        <div style={{ position: 'absolute', top: '12px', bottom: '12px', left: '11px', width: '2px', backgroundColor: '#f5f5f4', zIndex: 0 }} />
        
        {events.map((evt, idx) => (
          <div key={evt.id} style={{ position: 'relative', paddingLeft: '40px', marginBottom: idx === events.length - 1 ? 0 : '24px' }}>
            {/* Timeline dot/icon */}
            <div style={{ 
              position: 'absolute', left: '0', top: '0', 
              width: '24px', height: '24px', borderRadius: '50%', 
              backgroundColor: evt.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 4px white', zIndex: 1
            }}>
              {evt.icon}
            </div>
            
            {/* Content */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#11120D' }}>{evt.title}</span>
                <span style={{ fontSize: '11px', color: '#A0988A' }}>{evt.time}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#565449', lineHeight: 1.5 }}>
                {evt.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
