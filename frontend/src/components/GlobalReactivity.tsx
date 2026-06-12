'use client';
import { useEffect } from 'react';
import { initializeGlobalReactivity } from '../lib/events/memory-events';

export default function GlobalReactivity() {
  useEffect(() => {
    initializeGlobalReactivity();
  }, []);
  return null;
}
