'use client';

// "5,450+ templates": the live number of published templates in the style
// chosen in Admin → Templates (rounded down to 50 by default), so every page
// stays right as the library grows without anyone editing copy.

import { createContext, createElement, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

import { countLabel, roundedCountLabel, CountStyle } from './templateCountLabel';
export { roundedCountLabel, countLabel };

const KEY = 'mt:templateCount';
let cached: number | null = null;
let pending: Promise<number | null> | null = null;

function load(): Promise<number | null> {
  if (pending) return pending;
  pending = (async () => {
    try {
      const { count, error } = await supabase.from('templates').select('id', { count: 'exact', head: true }).eq('status', 'published');
      if (error || typeof count !== 'number' || count <= 0) return null;
      cached = count;
      try {
        sessionStorage.setItem(KEY, String(count));
      } catch {
        /* storage unavailable */
      }
      return count;
    } catch {
      return null;
    }
  })();
  return pending;
}

// The server passes the current number down (app/layout.tsx), so the first
// paint already shows it — no "1,000+" flashing before the real count.
const ServerCount = createContext<number | null>(null);
const ServerStyle = createContext<CountStyle>('rounded50');
export function TemplateCountProvider({ value, style = 'rounded50', children }: { value: number | null; style?: CountStyle; children: React.ReactNode }) {
  return createElement(ServerStyle.Provider, { value: style }, createElement(ServerCount.Provider, { value }, children));
}
/** The count style chosen in Admin, for components that format their own numbers. */
export const useCountStyle = () => useContext(ServerStyle);

/** Rounded label like "850+"; shows `fallback` until the real number arrives. */
export function useTemplateCountLabel(fallback = '1,000+') {
  const server = useContext(ServerCount);
  const style = useContext(ServerStyle);
  const [n, setN] = useState<number | null>(() => {
    if (server) return server;
    if (cached) return cached;
    try {
      const v = typeof window !== 'undefined' ? Number(sessionStorage.getItem(KEY)) : 0;
      return v > 0 ? v : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    let alive = true;
    load().then((v) => alive && v && setN(v));
    return () => {
      alive = false;
    };
  }, []);
  return n ? countLabel(n, style) : fallback;
}
