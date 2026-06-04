import React from 'react';
import { Share, Download, ChevronLeft, Calendar } from 'lucide-react';

export default function WeeklyDigestPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#57534e', fontSize: '14px', fontWeight: 500, cursor: 'pointer', padding: 0 }}>
          <ChevronLeft size={16} /> Past Digests
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', border: '1px solid #e7e5e4', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#11120D', cursor: 'pointer' }}>
            <Share size={14} /> Share
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#11120D', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} /> Save PDF
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '16px', padding: '48px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '48px', paddingBottom: '32px', borderBottom: '1px solid #e7e5e4' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
            <Calendar size={14} /> Weekly Digest
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#11120D', margin: '0 0 12px 0', fontFamily: 'Playfair Display, serif' }}>
            Week of March 10 – March 16, 2025
          </h1>
          <p style={{ fontSize: '16px', color: '#57534e', margin: 0 }}>
            You captured 42 new memories across 3 platforms this week.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#11120D', marginBottom: '16px' }}>What Memora learned about you this week</h2>
            <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '15px', color: '#44403c', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>You spent a significant portion of your technical chats discussing <strong>React architecture</strong> and state management.</li>
              <li>You exhibited high motivation early in the week, but showed signs of <strong>stress and fatigue</strong> by Thursday evening.</li>
              <li>You established a new connection between your coding goals and your desire for better documentation practices.</li>
            </ul>
          </section>

          <section style={{ backgroundColor: '#FAFAF9', padding: '24px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#11120D', marginBottom: '12px' }}>Emotional Weather</h2>
            <p style={{ fontSize: '15px', color: '#44403c', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
              "The week started with high energy and optimism, dipped into frustration mid-week during deep debugging sessions, and recovered beautifully into a relaxed, accomplished weekend."
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#11120D', marginBottom: '16px' }}>Goals Progress</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ border: '1px solid #e7e5e4', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', marginBottom: '8px' }}>Moved Forward</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#11120D' }}>Finish Memora MVP</div>
                <div style={{ fontSize: '13px', color: '#78716c' }}>Completed 2 milestones</div>
              </div>
              <div style={{ border: '1px solid #e7e5e4', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '8px' }}>Stalled</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#11120D' }}>Marathon Training</div>
                <div style={{ fontSize: '13px', color: '#78716c' }}>Missed 1 long run</div>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#11120D', marginBottom: '16px' }}>New Entities Discovered</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Docker Swarm', 'Project Phoenix', 'Next.js 16', 'Kettlebell swings'].map(entity => (
                <span key={entity} style={{ backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 500 }}>
                  {entity}
                </span>
              ))}
            </div>
          </section>

          <section style={{ borderTop: '1px solid #e7e5e4', paddingTop: '40px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#11120D', marginBottom: '16px' }}>Recommended Conversations</h2>
            <p style={{ fontSize: '14px', color: '#57534e', marginBottom: '16px' }}>Based on this week's data, consider asking Memora:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button style={{ textAlign: 'left', backgroundColor: 'white', border: '1px solid #e7e5e4', padding: '16px', borderRadius: '8px', fontSize: '14px', color: '#11120D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', backgroundColor: '#f5f5f4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>1</div>
                "Why was I so frustrated on Thursday?"
              </button>
              <button style={{ textAlign: 'left', backgroundColor: 'white', border: '1px solid #e7e5e4', padding: '16px', borderRadius: '8px', fontSize: '14px', color: '#11120D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', backgroundColor: '#f5f5f4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</div>
                "Help me adjust my marathon training schedule to catch up."
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
