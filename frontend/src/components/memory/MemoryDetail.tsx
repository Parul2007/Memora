'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft, Edit2, Pin, RefreshCw, Download, Trash2, Database, BrainCircuit, Calendar, Link as LinkIcon } from 'lucide-react';
import { MOCK_MEMORIES, getHealth } from '../../services/mockMemories';

export default function MemoryDetail({ memoryId }: { memoryId: string }) {
  const memory = MOCK_MEMORIES.find(m => m.id === memoryId) || MOCK_MEMORIES[0];
  const health = getHealth(memory.decayFactor);

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(memory.content);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      
      {/* Breadcrumb Header */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid #e7e5e4', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white' }}>
        <Link href="/memory" style={{ textDecoration: 'none', color: '#A0988A', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back
        </Link>
        <div style={{ width: '1px', height: '16px', backgroundColor: '#e7e5e4' }} />
        <span style={{ fontSize: '13px', color: '#A0988A' }}>Memory Vault</span>
        <ChevronRight size={14} color="#A0988A" />
        <span style={{ fontSize: '13px', color: '#A0988A', textTransform: 'capitalize' }}>{memory.type}</span>
        <ChevronRight size={14} color="#A0988A" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#11120D' }}>Memory #{memory.id}</span>
      </div>

      {/* 65/35 Split Layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Side (65%) - Core Memory Details */}
        <div style={{ flex: '65%', padding: '40px', overflowY: 'auto', borderRight: '1px solid #e7e5e4', backgroundColor: '#FAFAF9' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ backgroundColor: 'white', border: '1px solid #e7e5e4', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#11120D' }}>
              {memory.type}
            </span>
            <span style={{ fontSize: '12px', color: '#565449', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Database size={14} /> Source: {memory.source}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', backgroundColor: 'white', padding: '4px 12px', borderRadius: '8px', border: '1px solid #e7e5e4' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: health.color }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#11120D' }}>{health.label}</span>
            </div>
          </div>

          {/* Content Area */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid #e7e5e4', marginBottom: '32px' }}>
            {isEditing ? (
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
                style={{ width: '100%', minHeight: '120px', fontSize: '16px', lineHeight: 1.6, color: '#11120D', padding: '12px', border: '1px solid #D8CFBC', borderRadius: '8px', outline: 'none', resize: 'vertical' }}
              />
            ) : (
              <p style={{ fontSize: '18px', color: '#11120D', lineHeight: 1.6, margin: 0, fontFamily: 'Playfair Display, serif' }}>
                "{content}"
              </p>
            )}
            
            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: '#565449', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => setIsEditing(false)} style={{ backgroundColor: '#11120D', color: '#FFFBF4', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Save Changes</button>
              </div>
            )}
          </div>

          {/* Metadata Table */}
          <h3 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: '#A0988A', textTransform: 'uppercase', marginBottom: '16px' }}>Metadata</h3>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e7e5e4', overflow: 'hidden', marginBottom: '32px' }}>
            <div style={metaRowStyle}>
              <span style={metaLabelStyle}>Created</span>
              <span style={metaValueStyle}>{memory.dateObj.toLocaleDateString()}</span>
            </div>
            <div style={metaRowStyle}>
              <span style={metaLabelStyle}>Last accessed</span>
              <span style={metaValueStyle}>Yesterday ({memory.accessed} total access)</span>
            </div>
            <div style={metaRowStyle}>
              <span style={metaLabelStyle}>Importance</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ flex: 1, height: '4px', backgroundColor: '#e7e5e4', borderRadius: '2px' }}>
                  <div style={{ width: `${memory.importance * 100}%`, height: '100%', backgroundColor: '#11120D', borderRadius: '2px' }} />
                </div>
                <span style={metaValueStyle}>{memory.importance.toFixed(2)}</span>
              </div>
            </div>
            <div style={metaRowStyle}>
              <span style={metaLabelStyle}>Decay Factor</span>
              <span style={metaValueStyle}>{memory.decayFactor.toFixed(2)}</span>
            </div>
            <div style={metaRowStyle}>
              <span style={metaLabelStyle}>Consolidation Status</span>
              <span style={metaValueStyle}>Original memory</span>
            </div>
          </div>

          {/* Actions Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => setIsEditing(true)} style={actionBtnStyle}><Edit2 size={16} /> Edit</button>
            <button style={actionBtnStyle}><Pin size={16} /> Pin</button>
            <button style={{...actionBtnStyle, backgroundColor: '#11120D', color: '#FFFBF4', border: 'none'}}><RefreshCw size={16} /> Reinforce</button>
            <div style={{ flex: 1 }} />
            <button style={actionBtnStyle}><Download size={16} /> Export</button>
            <button style={{...actionBtnStyle, color: '#ef4444', borderColor: '#fecaca'}}><Trash2 size={16} /> Delete</button>
          </div>

        </div>

        {/* Right Side (35%) - Relationships */}
        <div style={{ flex: '35%', backgroundColor: 'white', padding: '32px', overflowY: 'auto' }}>
          
          <RelationalBlock title="ENTITY CONNECTIONS" icon={<BrainCircuit size={14} />}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {memory.tags.map(t => (
                <Link key={t} href="/graph" style={{ backgroundColor: '#f5f5f4', color: '#11120D', fontSize: '12px', fontWeight: 500, padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LinkIcon size={10} color="#A0988A" /> {t}
                </Link>
              ))}
            </div>
          </RelationalBlock>

          <RelationalBlock title="RELATED MEMORIES" icon={<Database size={14} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={relatedCardStyle}>
                <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700 }}>92% SIMILAR</span>
                <p style={{ fontSize: '12px', color: '#11120D', margin: '4px 0 0 0', lineHeight: 1.4 }}>"Mentioned wanting to be a TPM to bridge the gap between engineering and business."</p>
              </div>
              <div style={relatedCardStyle}>
                <span style={{ fontSize: '10px', color: '#a16207', fontWeight: 700 }}>76% SIMILAR</span>
                <p style={{ fontSize: '12px', color: '#11120D', margin: '4px 0 0 0', lineHeight: 1.4 }}>"Read an article on product architecture and saved notes to notion."</p>
              </div>
            </div>
          </RelationalBlock>

          <RelationalBlock title="APPEARS IN SESSIONS" icon={<Calendar size={14} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/chat" style={{ fontSize: '13px', color: '#11120D', textDecoration: 'underline', textUnderlineOffset: '4px' }}>My startup goals (Yesterday)</Link>
              <Link href="/chat" style={{ fontSize: '13px', color: '#11120D', textDecoration: 'underline', textUnderlineOffset: '4px' }}>Career planning (Last month)</Link>
            </div>
          </RelationalBlock>

        </div>
      </div>
    </div>
  );
}

function RelationalBlock({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#A0988A', letterSpacing: '0.05em', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

const metaRowStyle = { display: 'flex', padding: '12px 16px', borderBottom: '1px solid #f5f5f4', alignItems: 'center' };
const metaLabelStyle = { width: '160px', fontSize: '13px', color: '#565449', fontWeight: 500 };
const metaValueStyle = { fontSize: '13px', color: '#11120D', fontWeight: 600 };
const actionBtnStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e7e5e4', backgroundColor: 'white', color: '#11120D', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' };
const relatedCardStyle = { backgroundColor: '#FAFAF9', padding: '12px', borderRadius: '8px', border: '1px solid #e7e5e4' };
