'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Database, Zap, ArrowRight, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import AuthModal from '../components/AuthModal';

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // Force video to play to overcome some browser autoplay policies
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Silently catch AbortError to prevent console noise when browser pauses background media to save power
      });
    }
  }, []);

  return (
    <main style={{ padding: '0 48px 120px 48px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Hero Section (Video Box - No Text) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        style={{ 
          width: '100%', height: '560px', 
          backgroundColor: '#e5e5e5', borderRadius: '48px', 
          overflow: 'hidden', position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.04)'
        }}
      >
        <video 
          ref={videoRef}
          autoPlay loop muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        >
          <source src="/animation.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </motion.div>

      {/* Three Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
        
        {/* Box 1: Real AI Logos & Assistant */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            backgroundColor: '#fff0e6', borderRadius: '32px', padding: '40px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            position: 'relative', minHeight: '360px', overflow: 'hidden'
          }}
        >
          {/* Floating Real AI Logos */}
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <img src="https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128" alt="ChatGPT" width={24} height={24} style={{ borderRadius: '6px' }} />
          </motion.div>
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', bottom: '40px', right: '20px', backgroundColor: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <img src="https://www.google.com/s2/favicons?domain=gemini.google.com&sz=128" alt="Gemini" width={24} height={24} style={{ borderRadius: '6px' }} />
          </motion.div>
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: '80px', right: '40px', backgroundColor: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <img src="https://www.google.com/s2/favicons?domain=claude.ai&sz=128" alt="Claude" width={24} height={24} style={{ borderRadius: '6px', objectFit: 'contain' }} />
          </motion.div>
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', bottom: '80px', left: '30px', backgroundColor: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <img src="https://www.google.com/s2/favicons?domain=deepseek.com&sz=128" alt="DeepSeek" width={24} height={24} style={{ borderRadius: '6px' }} />
          </motion.div>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: '40px', left: '120px', backgroundColor: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <img src="https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/githubcopilot.svg" alt="GitHub Copilot" width={24} height={24} style={{ borderRadius: '6px' }} />
          </motion.div>
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', bottom: '20px', left: '140px', backgroundColor: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <img src="https://www.google.com/s2/favicons?domain=manus.im&sz=128" alt="Manus" width={24} height={24} style={{ borderRadius: '6px' }} />
          </motion.div>

          <h2 style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', textAlign: 'center', margin: 0, color: '#1c1917', position: 'relative', zIndex: 10, lineHeight: 1.3 }}>
            From scattered chats<br/>to a clear Panorama—<br/>Track your mind with Memora
          </h2>
        </motion.div>

        {/* Box 2: Feature List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            backgroundColor: 'white', borderRadius: '32px', padding: '40px',
            border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 20px 40px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ padding: '8px 16px', backgroundColor: '#f5f5f4', color: '#57534e', borderRadius: '9999px', fontSize: '13px', fontWeight: 600 }}>What We Offer</div>
          </div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ marginTop: '2px', backgroundColor: '#f0fdf4', color: '#16a34a', padding: '6px', borderRadius: '50%' }}><Database size={16} /></div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1c1917', margin: '0 0 4px 0' }}>Contextual Memory Storage</h3>
                <p style={{ fontSize: '14px', color: '#78716c', margin: 0, lineHeight: 1.5 }}>We index your conversation logs into a secure vector database. Advanced semantic search retrieves your history instantly when needed.</p>
              </div>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ marginTop: '2px', backgroundColor: '#fff0e6', color: '#f97316', padding: '6px', borderRadius: '50%' }}><Zap size={16} /></div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1c1917', margin: '0 0 4px 0' }}>Passive Pattern Detection</h3>
                <p style={{ fontSize: '14px', color: '#78716c', margin: 0, lineHeight: 1.5 }}>Our system scans your conversation text for recurring themes and milestones. It aggregates these semantic trends into a clean visual dashboard.</p>
              </div>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ marginTop: '2px', backgroundColor: '#fdf4ff', color: '#d946ef', padding: '6px', borderRadius: '50%' }}><ShieldCheck size={16} /></div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1c1917', margin: '0 0 4px 0' }}>Verifiable Data Security</h3>
                <p style={{ fontSize: '14px', color: '#78716c', margin: 0, lineHeight: 1.5 }}>You maintain absolute sovereignty over your records. Data stays isolated behind strict consent parameters and instant-wipe controls.</p>
              </div>
            </li>
          </ul>
        </motion.div>

        {/* Box 3: Feature Jump Links */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            backgroundColor: '#F5F5F0',
            borderRadius: '32px', padding: '40px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            position: 'relative', overflow: 'hidden'
          }}
        >
          <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', color: '#1c1917', margin: '0 0 16px 0', lineHeight: 1.2 }}>
            Explore Your Vault
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', maxWidth: '120px', lineHeight: 1.4 }}>Multi-Dimensional Analysis</span>
              <Link href="/insights" style={{ textDecoration: 'none' }}>
                <button style={{ backgroundColor: '#292524', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>Insights <ArrowRight size={14} /></button>
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', maxWidth: '120px', lineHeight: 1.4 }}>Relational Graph Visualisation</span>
              <Link href="/graph" style={{ textDecoration: 'none' }}>
                <button style={{ backgroundColor: '#292524', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>Graphs <ArrowRight size={14} /></button>
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1c1917', maxWidth: '120px', lineHeight: 1.4 }}>Goal Optimization & Habit Tracking</span>
              <Link href="/goals" style={{ textDecoration: 'none' }}>
                <button style={{ backgroundColor: '#292524', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>Goals <ArrowRight size={14} /></button>
              </Link>
            </div>
          </div>
        </motion.div>

      </div>

      {/* About Memora Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }}
        style={{
          marginTop: '64px',
          backgroundColor: '#FAFAF9', /* Very light neutral stone/grey */
          borderRadius: '48px',
          padding: '80px 120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'inline-flex', padding: '8px 16px', backgroundColor: '#f5f5f4', color: '#57534e', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, marginBottom: '32px' }}>About Memora</div>
        
        <h2 style={{ fontSize: '48px', fontFamily: 'Playfair Display, serif', color: '#1c1917', margin: '0 0 32px 0', lineHeight: 1.1, maxWidth: '800px' }}>
          The Architecture of Continuity
        </h2>
        
        <p style={{ fontSize: '18px', color: '#57534e', margin: '0 0 48px 0', lineHeight: 1.6, maxWidth: '800px' }}>
          Memora was born out of a simple question: Why should an AI forget you the second a chat session ends? Standard large language models operate in isolation, treating every conversation like a blank slate. We believe artificial intelligence shouldn't just process information—it should possess true continuity.
          <br/><br/>
          Memora is an intelligent, persistent AI companion built to act as a long-term digital brain. By architecting a multi-layered memory ecosystem—spanning immediate session context, deep relational knowledge graphs, and persistent semantic vaults—we give your AI the ability to genuinely remember, reason, and grow alongside you. Every conversation deepens its understanding, turning fragmented text into a lifelong, contextually coherent partnership.
        </p>

        <h3 style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', color: '#1c1917', margin: '0 0 16px 0' }}>Engineered for Absolute Trust</h3>
        <p style={{ fontSize: '18px', color: '#57534e', margin: 0, lineHeight: 1.6, maxWidth: '800px' }}>
          We treat your digital mind with the engineering rigor it deserves. Memora is meticulously built on a foundation of verifiable data security, cross-platform ingestion, and decentralized storage tiers. We believe that giving an AI a long-term brain shouldn't mean sacrificing your privacy—which is why absolute data sovereignty and explicit consent parameters are baked into every single layer of our codebase.
        </p>
      </motion.div>

      {/* Get Started Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        style={{
          marginTop: '64px',
          backgroundColor: '#F5F5F0',
          borderRadius: '48px',
          padding: '80px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.02)',
          border: '1px solid rgba(0,0,0,0.04)'
        }}
      >
        <h2 style={{ fontSize: '36px', fontFamily: 'Playfair Display, serif', color: '#1c1917', margin: '0 0 16px 0' }}>Get Started</h2>
        {user ? (
          <>
            <p style={{ fontSize: '16px', color: '#57534e', margin: '0 0 32px 0', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              You are signed in! Enter your Memory Vault to view your contextual timeline, insights, and goal tracker.
            </p>
            <Link href="/memory" style={{ textDecoration: 'none' }}>
              <button style={{ backgroundColor: '#292524', color: 'white', border: 'none', padding: '16px 32px', borderRadius: '9999px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Enter your Vault <ArrowRight size={16} />
              </button>
            </Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: '16px', color: '#57534e', margin: '0 0 32px 0', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              Join Memora today to create your secure, private, and permanent AI memory vault. Never lose context of a thought again.
            </p>
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              style={{ backgroundColor: '#292524', color: 'white', border: 'none', padding: '16px 32px', borderRadius: '9999px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Sign In / Sign Up <ArrowRight size={16} />
            </button>
          </>
        )}
      </motion.div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

    </main>
  );
}
