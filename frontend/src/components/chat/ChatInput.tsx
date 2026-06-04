import React, { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, Mic, Square } from 'lucide-react';
import { usePrecompute } from '../../hooks/usePrecompute';

export default function ChatInput({ value, onChange, onSend, isGenerating, onStop }: { value: string, onChange: (val: string) => void, onSend: (attachments: {name: string, content: string}[]) => void, isGenerating?: boolean, onStop?: () => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<{name: string, content: string}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  usePrecompute(value);

  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  
  const SLASH_COMMANDS = [
    { cmd: '/summarize', desc: 'Summarize the current session' },
    { cmd: '/goals', desc: 'List current goals' },
    { cmd: '/reflect', desc: 'Trigger deep reflection' },
    { cmd: '/export', desc: 'Export this session' }
  ];
  
  const filteredCommands = SLASH_COMMANDS.filter(c => c.cmd.startsWith('/' + slashQuery));

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Check for slash menu
    const lastWord = val.split(' ').pop() || '';
    if (lastWord.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashQuery(lastWord.slice(1).toLowerCase());
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleCommandSelect = (cmd: string) => {
    const words = value.split(' ');
    words.pop(); // remove the partial slash command
    const newValue = [...words, cmd].join(' ') + ' ';
    onChange(newValue);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Max height approx 6 lines (144px)
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 144)}px`;
      textareaRef.current.style.overflowY = scrollHeight > 144 ? 'auto' : 'hidden';
    }
  }, [value]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript) {
            onChange(value + (value ? ' ' : '') + finalTranscript);
          }
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, [value, onChange]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setAttachments(prev => [...prev, { name: file.name, content: text }]);
      };
      reader.readAsText(file);
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommandSelect(filteredCommands[0].cmd);
        return;
      }
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() || attachments.length > 0) {
        onSend(attachments);
        setAttachments([]);
      }
    }
  };

  const handleSendClick = () => {
    if (isGenerating && onStop) {
      onStop();
      return;
    }
    if (value.trim() || attachments.length > 0) {
      onSend(attachments);
      setAttachments([]);
    }
  };

  return (
    <div style={{ padding: '0 48px 24px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      
      {/* Slash Commands Menu */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% - 10px)', left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '800px', backgroundColor: 'white', borderRadius: '12px',
          border: '1px solid #e7e5e4', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 50,
          padding: '8px'
        }}>
          {filteredCommands.map((c, i) => (
            <div 
              key={c.cmd} 
              onClick={() => handleCommandSelect(c.cmd)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
                cursor: 'pointer', borderRadius: '8px', backgroundColor: i === 0 ? '#f5f5f4' : 'transparent',
                transition: 'background 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f4'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i === 0 ? '#f5f5f4' : 'transparent'}
            >
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#11120D', fontFamily: 'monospace' }}>{c.cmd}</span>
              <span style={{ fontSize: '12px', color: '#78716c' }}>{c.desc}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        width: '100%', maxWidth: '800px', 
        backgroundColor: 'white', borderRadius: '24px', 
        border: '1px solid #A0988A', boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'flex-end', padding: '12px 16px', gap: '12px',
        position: 'relative'
      }}>
        
        {/* Left Actions */}
        <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".txt,.md,.csv,.json" 
            style={{ display: 'none' }} 
            multiple 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            title="Attach document" 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = '#57534e'}
            onMouseLeave={e => e.currentTarget.style.color = '#a8a29e'}
          >
            <Paperclip size={20} />
          </button>
        </div>

        {/* Textarea & Attachments */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {attachments.map((att, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                  📄 {att.name}
                  <button 
                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', padding: 0, marginLeft: '4px', fontSize: '14px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message or '/' for commands..."
            style={{
              flex: 1, minHeight: '24px', maxHeight: '144px',
              border: 'none', outline: 'none', resize: 'none',
              fontSize: '15px', color: '#11120D', backgroundColor: 'transparent',
              lineHeight: 1.5, padding: '2px 0'
            }}
          />
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
          <button 
            onClick={toggleRecording}
            title={isRecording ? "Stop recording" : "Voice input"} 
            style={{ 
              background: isRecording ? '#fee2e2' : 'none', 
              border: 'none', cursor: 'pointer', 
              color: isRecording ? '#ef4444' : '#a8a29e', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', width: '32px', height: '32px',
              animation: isRecording ? 'pulse 1.5s infinite' : 'none'
            }}
            onMouseEnter={e => !isRecording && (e.currentTarget.style.color = '#57534e')}
            onMouseLeave={e => !isRecording && (e.currentTarget.style.color = '#a8a29e')}
          >
            <Mic size={20} />
          </button>
          
          <button 
            onClick={handleSendClick}
            disabled={!isGenerating && !value.trim() && attachments.length === 0}
            style={{ 
              backgroundColor: isGenerating ? '#11120D' : (value.trim() || attachments.length > 0) ? '#11120D' : '#f5f5f4', 
              color: isGenerating ? '#FFFBF4' : (value.trim() || attachments.length > 0) ? '#FFFBF4' : '#a8a29e', 
              border: 'none', borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: (isGenerating || value.trim() || attachments.length > 0) ? 'pointer' : 'default', transition: 'all 0.2s'
            }}
          >
            {isGenerating ? <Square size={12} fill="currentColor" /> : <Send size={14} style={{ marginLeft: '2px' }} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>

      <div style={{ fontSize: '11px', color: '#A0988A', marginTop: '12px', display: 'flex', gap: '12px' }}>
        <span><strong>Enter</strong> to send</span>
        <span><strong>Shift+Enter</strong> for new line</span>
      </div>
    </div>
  );
}
