'use client';

// Counts page views and daily visitors for Admin → Overview. Tiny on purpose:
// no tracking library, no cookies — a random id kept in this browser, one
// small request per page, sent after the page has loaded. Admin pages,
// bots and automated browsers are not counted.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function visitorId() {
  try {
    let v = localStorage.getItem('mt:vid');
    if (!v) {
      v = (crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
      localStorage.setItem('mt:vid', v);
    }
    return v;
  } catch {
    return null;
  }
}

function accessToken() {
  try {
    const ref = URL_.match(/https:\/\/([^.]+)\./)?.[1];
    const raw = ref && localStorage.getItem(`sb-${ref}-auth-token`);
    return raw ? JSON.parse(raw)?.access_token || null : null;
  } catch {
    return null;
  }
}

function referrerHost() {
  try {
    if (!document.referrer) return null;
    const h = new URL(document.referrer).hostname.replace(/^www\./, '');
    return h === window.location.hostname.replace(/^www\./, '') ? null : h;
  } catch {
    return null;
  }
}

const device = () => (/Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : 'desktop');

export function VisitCounter() {
  const path = usePathname();
  useEffect(() => {
    if (!URL_ || !KEY || !path || path.startsWith('/admin') || path.startsWith('/api')) return;
    if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent)) return;
    const vid = visitorId();
    if (!vid) return;
    const first = !sessionStorage.getItem('mt:seen');
    try { sessionStorage.setItem('mt:seen', '1'); } catch {}
    const send = () => {
      const token = accessToken();
      const init: RequestInit = {
        method: 'POST',
        keepalive: true,
        headers: { apikey: KEY, Authorization: `Bearer ${token || KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_path: path, p_visitor: vid, p_referrer: first ? referrerHost() : null, p_device: device() }),
      };
      // Same route as the rest of the site: direct, or through our own
      // domain when Supabase can't be reached directly (lib/supabase.ts).
      fetch(`${URL_}/rest/v1/rpc/track_visit`, init).catch(() => fetch(`${window.location.origin}/sb/rest/v1/rpc/track_visit`, init).catch(() => {}));
    };
    const t = window.setTimeout(send, 1500);
    return () => window.clearTimeout(t);
  }, [path]);
  return null;
}
