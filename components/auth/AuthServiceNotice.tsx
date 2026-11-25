'use client';
// Shown on the login / sign-up pages when the sign-in service is down, so people
// know it is on our side (and that their account is safe) instead of waiting on a spinner.
import { useEffect, useState } from 'react';

export function useAuthService(): 'checking' | 'up' | 'down' {
  const [s, setS] = useState<'checking' | 'up' | 'down'>('checking');
  useEffect(() => {
    let alive = true;
    const run = () => fetch('/api/auth-status', { cache: 'no-store' })
      .then((r) => r.json()).then((j) => { if (alive) setS(j.ok ? 'up' : 'down'); })
      .catch(() => { if (alive) setS('up'); }); // can't tell — don't alarm anyone
    run();
    const id = setInterval(run, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return s;
}

export default function AuthServiceNotice({ state }: { state: 'checking' | 'up' | 'down' }) {
  if (state !== 'down') return null;
  return (
    <div role="status" className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
      <p className="font-semibold">Sign-in is temporarily unavailable</p>
      <p className="mt-1">We’re fixing a problem on our server. Your account and designs are safe. This page checks again every 30 seconds — you can try as soon as this notice disappears. Templates and tools still work without signing in.</p>
    </div>
  );
}
