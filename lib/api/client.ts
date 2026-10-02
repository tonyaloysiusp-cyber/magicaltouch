import { supabase } from '@/lib/supabase';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Every call to our own /api/* routes needs the caller's own Supabase
// access token attached, so the route handler can verify it (see
// lib/api/auth.ts's requireUser) instead of trusting anything the
// request body claims about who's asking.
async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('Not signed in', 401);
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json', ...(init.headers || {}) };
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response body wasn't JSON -- keep the generic message
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return null as T;
  return res.json();
}
