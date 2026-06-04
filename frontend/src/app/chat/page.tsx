'use client';

import React from 'react';
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatMainArea from '../../components/chat/ChatMainArea';
import { useAuth } from '../../lib/AuthContext';
import { useProtectedRoute } from '../../lib/useProtectedRoute';
import AccessDenied from '../../components/AccessDenied';

export default function ChatPage() {
  const { loading } = useAuth();
  const { isReady } = useProtectedRoute();

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#78716c' }}>Loading...</div>;
  }

  if (!isReady) return <AccessDenied pageName="Chat" />;

  return (
    <div className="responsive-sidebar-layout" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Left Sidebar */}
      <ChatSidebar />

      {/* Main Chat Area */}
      <main className="chat-main-container">
        <ChatMainArea />
      </main>
    </div>
  );
}
