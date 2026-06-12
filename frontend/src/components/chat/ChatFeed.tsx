import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Edit2, Copy, ThumbsUp, ThumbsDown, ChevronDown, Hexagon, Check, ArrowDown, RotateCcw, Search, BrainCircuit, PenTool } from 'lucide-react';
import { Message, StreamState, MemoryItem } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useChatStore } from '../../stores/chatStore';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCognitiveBlocks, MemoryRetrievalCard, KnowledgeGraphCard, MemoryLearningCard } from './CognitiveBlocks';

// Relative time formatting helper
function getRelativeTimeString(dateInput?: string | Date): string {
  if (!dateInput) return "Just now";
  if (dateInput === "Just now") return "Just now";
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "Just now";
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) return "Just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatFeed({ messages, isTyping, onMemoryPillClick, onRegenerate, onEditMessage, onFeedback }: { messages: Message[], isTyping?: boolean, onMemoryPillClick?: () => void, onRegenerate?: (id: string) => void, onEditMessage?: (id: string, content: string) => void, onFeedback?: (id: string, rating: 'up' | 'down') => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const { activeStreamState } = useChatStore();

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    
    setAutoScroll(isAtBottom);
    setShowScrollBottom(!isAtBottom);
  };

  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ 
        behavior: activeStreamState === StreamState.GENERATING ? 'auto' : 'smooth' 
      });
    }
  }, [messages, isTyping, autoScroll, activeStreamState]);

  const scrollToBottom = () => {
    setAutoScroll(true);
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      style={{ flex: 1, overflowY: 'auto', padding: '24px 48px', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {messages.map((msg, index) => {
        const dateObj = msg.createdAt ? new Date(msg.createdAt) : new Date();
        const dateString = isNaN(dateObj.getTime()) 
          ? new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
          : dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        
        const prevCreatedAt = index > 0 ? messages[index - 1].createdAt : undefined;
        const prevDateObj = prevCreatedAt ? new Date(prevCreatedAt) : null;
        const prevDate = prevDateObj && !isNaN(prevDateObj.getTime())
          ? prevDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
          : null;
        
        return (
          <React.Fragment key={msg.id}>
            {dateString !== prevDate && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#A0988A', backgroundColor: '#FAFAF9', padding: '4px 12px', borderRadius: '9999px', border: '1px solid #e7e5e4' }}>
                  {dateString}
                </span>
              </div>
            )}
            <MessageBubble 
              msg={msg} 
              isLast={index === messages.length - 1}
              onMemoryPillClick={onMemoryPillClick} 
              onRegenerate={onRegenerate}
              onEditMessage={onEditMessage}
              onFeedback={onFeedback}
            />
          </React.Fragment>
        );
      })}
      
        <div ref={endRef} style={{ height: '24px', flexShrink: 0 }} />
      </div>

      {showScrollBottom && (
        <button 
          onClick={scrollToBottom}
          style={{
            position: 'fixed', bottom: '120px', right: '420px',
            backgroundColor: 'white', border: '1px solid #e7e5e4', borderRadius: '50%',
            width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 10, color: '#57534e'
          }}
        >
          <ArrowDown size={16} />
        </button>
      )}

      <style>{`
        .markdown-body pre {
          background-color: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 8px; overflow-x: auto;
          margin: 12px 0; font-family: monospace; font-size: 13px; position: relative;
        }
        .markdown-body code {
          background-color: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em;
        }
        .markdown-body pre code {
          background-color: transparent; padding: 0; color: inherit;
        }
        .markdown-body p { margin: 0 0 12px 0; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul, .markdown-body ol { margin: 0 0 12px 0; padding-left: 24px; }
        .markdown-body li { margin-bottom: 4px; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { margin: 16px 0 8px 0; font-weight: 600; line-height: 1.2; }
        .markdown-body h1 { font-size: 1.5em; }
        .markdown-body h2 { font-size: 1.3em; }
        .markdown-body h3 { font-size: 1.1em; }
        .markdown-body blockquote { border-left: 3px solid #d6d3d1; margin: 0; padding-left: 12px; color: #57534e; }
        .markdown-body table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .markdown-body th, .markdown-body td { border: 1px solid #e7e5e4; padding: 6px 12px; text-align: left; }
        .markdown-body th { background-color: rgba(0,0,0,0.02); }
      `}</style>
    </div>
  );
}

function CodeBlock({ node, inline, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const textContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div style={{ position: 'relative', marginTop: '12px', marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#1e1e1e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2d2d2d', padding: '6px 12px', borderBottom: '1px solid #404040' }}>
          <span style={{ fontSize: '11px', color: '#a3a3a3', fontFamily: 'sans-serif', textTransform: 'lowercase' }}>{language}</span>
          <button 
            onClick={handleCopy}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '11px' }}
          >
            {copied ? <><Check size={12} color="#16a34a" /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
        <pre style={{ margin: 0, padding: '12px', overflowX: 'auto' }}>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }
  
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

function MessageBubble({ msg, isLast, onMemoryPillClick, onRegenerate, onEditMessage, onFeedback }: { msg: Message, isLast?: boolean, onMemoryPillClick?: () => void, onRegenerate?: (id: string) => void, onEditMessage?: (id: string, content: string) => void, onFeedback?: (id: string, rating: 'up' | 'down') => void }) {
  const isUser = msg.role === 'user';
  const { activeStreamState } = useChatStore();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(msg.feedback || null);
  const [showCognitiveTrace, setShowCognitiveTrace] = useState(false);

  const relativeTimestamp = getRelativeTimeString(msg.createdAt || msg.timestamp);
  
  const dateObj = msg.createdAt ? new Date(msg.createdAt) : new Date();
  const absoluteTimestamp = isNaN(dateObj.getTime()) ? new Date().toLocaleString() : dateObj.toLocaleString();

  const cognitiveBlocks = useMemo(() => {
    if (!isUser && msg.metadata?.pipeline_flow) {
      // Deduplicate blocks
      const parsed = parseCognitiveBlocks(msg.metadata.pipeline_flow, `msg-${msg.id}`);
      const unique = new Map<string, any>();
      parsed.forEach(b => {
        if (b.type === 'learning' && b.data.memory) {
          unique.set('learning:' + b.data.memory.content, b);
        } else {
          unique.set(b.id, b);
        }
      });
      return Array.from(unique.values());
    }
    return [];
  }, [msg.metadata?.pipeline_flow, isUser, msg.id]);

  // Active streaming state representing cognitive loading
  const isCurrentAssistantStreaming = !isUser && isLast && 
    activeStreamState !== StreamState.IDLE && 
    activeStreamState !== StreamState.COMPLETE &&
    activeStreamState !== StreamState.ERROR &&
    // Don't show cognitive bar during REFLECTING if response content already exists
    !(activeStreamState === StreamState.REFLECTING && msg.content.length > 0);

  if (!isUser && !msg.content && !isCurrentAssistantStreaming && !msg.isError) {
    return null; 
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== msg.content && onEditMessage) {
      onEditMessage(msg.id, editContent);
    }
    setIsEditing(false);
  };

  const controlBtnStyle = { 
    background: 'none', 
    border: 'none', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '3px',
    color: '#A0988A', 
    fontSize: '11px',
    fontWeight: 500,
    padding: '2px 4px',
    borderRadius: '4px',
    transition: 'all 0.15s'
  };

  // Determine active cognitive phase and icon
  const getCognitiveState = () => {
    if (activeStreamState === StreamState.RETRIEVING) {
      return { text: "Searching memories...", icon: <Search size={14} className="animate-spin text-amber-500" /> };
    }
    if (activeStreamState === StreamState.THINKING) {
      return { text: "Thinking...", icon: <BrainCircuit size={14} className="animate-pulse text-purple-500" /> };
    }
    if (activeStreamState === StreamState.REFLECTING) {
      return { text: "Saving memories...", icon: <BrainCircuit size={14} className="animate-pulse text-blue-500" /> };
    }
    if (activeStreamState === StreamState.GENERATING) {
      if (msg.content.length === 0) {
        return { text: "Constructing response...", icon: <PenTool size={14} className="animate-bounce text-green-500" /> };
      } else {
        return { text: "Streaming answer...", icon: <PenTool size={14} className="text-green-600 animate-pulse" /> };
      }
    }
    return { text: "Searching memories...", icon: <Search size={14} className="animate-spin text-amber-500" /> };
  };

  const cogState = getCognitiveState();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
      <div style={{ 
        maxWidth: '80%', 
        backgroundColor: msg.isError ? '#fef2f2' : (isUser ? '#f5f5f4' : '#fafaf9'), 
        border: msg.isError ? '1px solid #fecaca' : (isUser ? 'none' : '1px solid #e7e5e4'),
        padding: '12px 16px', 
        borderRadius: '16px', 
        borderBottomLeftRadius: isUser ? '16px' : '4px',
        borderBottomRightRadius: isUser ? '4px' : '16px',
        color: msg.isError ? '#dc2626' : '#11120D', 
        fontSize: '15px', 
        lineHeight: 1.6,
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        position: 'relative'
      }}>
        
        {/* Dynamic Cognitive State Panel for active streaming assistant turn */}
        {isCurrentAssistantStreaming && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', 
            backgroundColor: '#1E1E1E', color: '#E8E8E8', 
            padding: '6px 12px', borderRadius: '10px', 
            fontSize: '12px', fontWeight: 600,
            marginBottom: msg.content ? '12px' : '0px',
            width: 'max-content',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid #333'
          }}>
            <AnimatePresence mode="wait">
              <motion.div 
                key={cogState.text}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {cogState.icon}
                <span>{cogState.text}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div className={isUser ? "markdown-body user-message-body" : "markdown-body"}>
          {isUser ? (
            isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px' }}>
                <textarea 
                  value={editContent} 
                  onChange={e => setEditContent(e.target.value)}
                  style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', color: '#78716c' }}>Cancel</button>
                  <button onClick={handleSaveEdit} style={{ backgroundColor: '#1c1917', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}>Save & Submit</button>
                </div>
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
                {msg.content}
              </ReactMarkdown>
            )
          ) : (
            msg.content && (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeHighlight]}
                components={{ code: CodeBlock }}
              >
                {msg.content}
              </ReactMarkdown>
            )
          )}
        </div>
      </div>

      {showCognitiveTrace && cognitiveBlocks.length > 0 && (
        <div style={{ 
          marginTop: '12px', 
          width: '100%', 
          maxWidth: '80%', 
          padding: '16px', 
          backgroundColor: '#fafaf9', 
          border: '1px solid #e7e5e4', 
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#78716c', textTransform: 'uppercase', marginBottom: '4px' }}>
            Cognitive Trace
          </div>
          {cognitiveBlocks.map(b => {
            if (b.type === 'retrieval') return <MemoryRetrievalCard key={b.id} data={b.data} />;
            if (b.type === 'graph') return <KnowledgeGraphCard key={b.id} data={b.data} />;
            if (b.type === 'learning') return <MemoryLearningCard key={b.id} data={b.data} />;
            return null;
          })}
        </div>
      )}

      {/* Persistent action controls & relative timestamp beneath bubbles */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        marginTop: '6px', 
        flexWrap: 'wrap',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        width: '100%',
        maxWidth: '80%'
      }}>
        {/* Memories Pill if present inside bubble */}
        {!isUser && msg.memories && msg.memories.length > 0 && (
          <button 
            onClick={onMemoryPillClick}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '4px', 
              backgroundColor: '#FFFBF4', border: '1px solid #D8CFBC', borderRadius: '9999px',
              padding: '2px 8px', fontSize: '10px', fontWeight: 600, color: '#a16207', cursor: 'pointer'
            }}
          >
            <Hexagon size={10} /> {msg.memories.length} memories used
          </button>
        )}
        
        {!isUser && msg.memories && msg.memories.length > 0 && (
          <span style={{ fontSize: '11px', color: '#d6d3d1' }}>•</span>
        )}

        {/* Hover absolute timestamp & Relative timestamp */}
        <span 
          title={relativeTimestamp} 
          style={{ fontSize: '11px', color: '#A0988A', cursor: 'help', textDecoration: 'none' }}
        >
          {isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        <span style={{ fontSize: '11px', color: '#d6d3d1' }}>•</span>

        {/* Action Controls */}
        {isUser ? (
          <>
            <button onClick={() => setIsEditing(true)} style={controlBtnStyle} title="Edit Prompt">
              <Edit2 size={12} /> Edit
            </button>
            <span style={{ fontSize: '11px', color: '#d6d3d1' }}>•</span>
            <button onClick={handleCopy} style={controlBtnStyle} title="Copy Prompt">
              {copied ? <Check size={12} color="#16a34a" /> : <><Copy size={12} /> Copy</>}
            </button>
          </>
        ) : (
          <>
            <button onClick={handleCopy} style={controlBtnStyle} title="Copy Response">
              {copied ? <Check size={12} color="#16a34a" /> : <><Copy size={12} /> Copy</>}
            </button>
            <span style={{ fontSize: '11px', color: '#d6d3d1' }}>•</span>
            <button 
              style={{ ...controlBtnStyle, color: feedback === 'up' ? '#16a34a' : '#A0988A' }} 
              onClick={() => {
                const nextVal = feedback === 'up' ? null : 'up';
                setFeedback(nextVal);
                if (onFeedback) onFeedback(msg.id, nextVal || 'up');
              }}
              title="Good Response"
            >
              <ThumbsUp size={12} fill={feedback === 'up' ? 'currentColor' : 'none'} />
            </button>
            <span style={{ fontSize: '11px', color: '#d6d3d1' }}>•</span>
            <button 
              style={{ ...controlBtnStyle, color: feedback === 'down' ? '#dc2626' : '#A0988A' }} 
              onClick={() => {
                const nextVal = feedback === 'down' ? null : 'down';
                setFeedback(nextVal);
                if (onFeedback) onFeedback(msg.id, nextVal || 'down');
              }}
              title="Bad Response"
            >
              <ThumbsDown size={12} fill={feedback === 'down' ? 'currentColor' : 'none'} />
            </button>
            {isLast && onRegenerate && (
              <>
                <span style={{ fontSize: '11px', color: '#d6d3d1' }}>•</span>
                <button onClick={() => onRegenerate(msg.id)} style={controlBtnStyle} title="Regenerate Answer">
                  <RotateCcw size={12} /> Regenerate
                </button>
              </>
            )}
            {cognitiveBlocks.length > 0 && (
              <>
                <span style={{ fontSize: '11px', color: '#d6d3d1' }}>•</span>
                <button 
                  onClick={() => setShowCognitiveTrace(!showCognitiveTrace)} 
                  style={{ ...controlBtnStyle, color: showCognitiveTrace ? '#1c1917' : '#A0988A' }} 
                  title="View Cognitive Trace"
                >
                  <BrainCircuit size={12} /> {showCognitiveTrace ? 'Hide Trace' : 'Trace'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
