/**
 * src/services/apiClient.ts
 *
 * Central HTTP client for all backend requests.
 * Automatically injects the Supabase JWT as Bearer token.
 * All pages import from here — never call fetch() directly.
 */

import { supabase } from '../lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://memora-production-1232.up.railway.app';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Not authenticated — backend may still accept request in dev mode
  }
  return headers;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * Stream SSE from the backend chat endpoint.
 * Returns an async generator that yields text chunks.
 */
export async function* apiStream(
  path: string,
  body: unknown,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new ApiError(res.status, 'Stream failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6);
            if (rawData.trim() === '[DONE]') continue;
            const data = rawData.replace(/\r$/, '');
            yield data;
          }
        }
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const rawData = line.slice(6);
        if (rawData.trim() === '[DONE]') continue;
        const data = rawData.replace(/\r$/, '');
        yield data;
      }
    }
  }
}
