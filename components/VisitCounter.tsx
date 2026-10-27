'use client';

// Counts page views and daily visitors for the admin panel. Tiny on
// purpose: no tracking library, no cookies — a random id kept in this
// browser, one small request per page (our own /api/track, which adds the
// country), sent after the page has loaded. Also reports JavaScript errors
// so Admin → Health can show problems before customers report them.
// Admin pages and robots are not counted.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

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

function campaign() {
  try {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('utm_source'), c = p.get('utm_campaign');
    return s || c ? [s, c].filter(Boolean).join(' / ') : null;
  } catch {
    return null;
  }
}

const device = () => (/iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop');

function send(body: object) {
  const token = accessToken();
  fetch('/api/track', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }).catch(() => {});
}

let errorsSent = 0;
const seen = new Set<string>();
function reportError(message: string) {
  const path = window.location.pathname;
  if (path.startsWith('/admin') || errorsSent >= 5) return;
  const key = `${path}|${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  errorsSent++;
  send({ kind: 'error', path, message });
}

export function VisitCounter() {
  const path = usePathname();

  useEffect(() => {
    const onErr = (e: ErrorEvent) => e.message && !/ResizeObserver loop|Script error/i.test(e.message) && reportError(e.message);
    const onRej = (e: PromiseRejectionEvent) => { const m = String((e.reason && (e.reason.message || e.reason)) || ''); if (m && !/AbortError|aborted/i.test(m)) reportError(`Unhandled: ${m}`); };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej); };
  }, []);

  useEffect(() => {
    if (!path || path.startsWith('/admin') || path.startsWith('/api')) return;
    if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent)) return;
    const vid = visitorId();
    if (!vid) return;
    let first = false;
    try { first = !sessionStorage.getItem('mt:seen'); sessionStorage.setItem('mt:seen', '1'); } catch {}
    const t = window.setTimeout(() => {
      // How long the first page took to load (the speed people feel).
      let loadMs: number | undefined;
      if (first) {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (nav && nav.loadEventEnd > 0) loadMs = nav.loadEventEnd;
      }
      send({ kind: 'view', path, visitor: vid, referrer: first ? referrerHost() : null, device: device(), utm: first ? campaign() : null, loadMs });
    }, 1500);
    return () => window.clearTimeout(t);
  }, [path]);
  return null;
}
