'use client';

import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import type { AppTheme } from '@/hooks/useAppTheme';

// Shown once per browser session (not on every reload/navigation —
// "first load" means the first time this tab opens the site, not every
// time someone revisits the homepage) via sessionStorage, and skipped
// entirely under prefers-reduced-motion: reduce. Uses the site's real,
// existing logo via BrandLogo (/logo.png, /logo-white.png) — no
// fabricated replacement mark.
const INTRO_SESSION_KEY = 'magicaltouch:introShown';

type Phase = 'pending' | 'visible' | 'leaving' | 'done';

export function IntroAnimation({ theme }: { theme: AppTheme }) {
  const [phase, setPhase] = useState<Phase>('pending');

  useEffect(() => {
    let reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduced = false;
    }
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown || reduced) {
      setPhase('done');
      return;
    }
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch {
      // Private-browsing or storage-disabled: the intro will simply
      // replay on the next load instead of persisting "already shown" —
      // a harmless degradation, not a broken feature.
    }
    setPhase('visible');
    const leaveTimer = setTimeout(() => setPhase('leaving'), 1700);
    const doneTimer = setTimeout(() => setPhase('done'), 2100);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === 'pending' || phase === 'done') return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      data-intro-phase={phase}
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-mt-surface dark:bg-mt-bg transition-opacity duration-400 ease-out ${
        phase === 'leaving' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex items-center justify-center w-56 h-56">
        <span className="absolute w-28 h-28 rounded-full border border-[#8b5cf6]/25 dark:border-[#a78bfa]/25 animate-intro-orbit" />
        <span className="absolute w-44 h-44 rounded-full border border-[#8b5cf6]/12 dark:border-[#a78bfa]/12 animate-intro-orbit-reverse" />
        <div className="animate-intro-logo-in opacity-0">
          <BrandLogo theme={theme} width={168} height={34} priority />
        </div>
      </div>
    </div>
  );
}
