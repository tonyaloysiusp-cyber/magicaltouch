'use client';

// "850+ templates": the live number of published templates, rounded down
// to the nearest 50, so the home page stays honest as the library grows
// (856 → "850+", 912 → "900+") without anyone editing copy.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const roundedCountLabel = (n: number) => (n >= 100 ? `${Math.floor(n / 50) * 50}+` : n > 0 ? `${n}+` : '');

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

/** Rounded label like "850+"; shows `fallback` until the real number arrives. */
export function useTemplateCountLabel(fallback = '700+') {
  const [n, setN] = useState<number | null>(() => {
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
  return n ? roundedCountLabel(n) : fallback;
}
