import { useEffect, useRef } from 'react';
import { apiFetch } from '../services/apiClient';

export function usePrecompute(content: string) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPrecomputedContent = useRef<string>('');

  useEffect(() => {
    if (!content || content.length < 5) return;
    
    // Don't precompute if the content hasn't changed much
    if (Math.abs(content.length - lastPrecomputedContent.current.length) < 10) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      lastPrecomputedContent.current = content;
      apiFetch('/api/chat/precompute', {
        method: 'POST',
        body: JSON.stringify({ partial_content: content }),
      }).catch(() => {
        // Silent failure for precomputation
      });
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content]);
}
