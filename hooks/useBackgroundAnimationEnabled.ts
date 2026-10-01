'use client';

import { useEffect, useState } from 'react';

// Backs every ambient/decorative background animation across the site
// (see components/home/AnimatedDesignBackground.tsx). Three independent
// reasons to go still, each real rather than guessed:
// 1. prefers-reduced-motion: reduce -- never animate for a visitor who
//    explicitly asked for less motion, and stays live if they change the
//    OS setting while the tab is open.
// 2. The tab isn't visible -- no point spending compositor work on an
//    animation nobody can see; resumes the moment it's visible again.
// 3. The device can't hold a steady frame rate -- sampled once via a
//    short burst of real requestAnimationFrame callbacks right after
//    mount (not a guessed device/UA check), so a genuinely slow device
//    gets a still background instead of a stuttery one.
export function useBackgroundAnimationEnabled(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [perfOk, setPerfOk] = useState(true);

  useEffect(() => {
    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return undefined;
    }
    setReducedMotion(mql.matches);
    const onChange = () => setReducedMotion(!!mql && mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql?.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => setTabVisible(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return undefined;
    let cancelled = false;
    let rafId = 0;
    let frames = 0;
    let last = 0;
    const deltas: number[] = [];
    const SAMPLE_FRAMES = 20;
    const tick = (now: number) => {
      if (cancelled) return;
      deltas.push(now - last);
      last = now;
      frames++;
      if (frames < SAMPLE_FRAMES) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      // Drop the first delta (includes setup/layout cost, not a real
      // frame interval) before averaging the rest.
      const avg = deltas.slice(1).reduce((a, b) => a + b, 0) / Math.max(1, deltas.length - 1);
      // ~60fps is ~16.7ms/frame; treat a sustained average worse than
      // ~30fps (33ms/frame) as "can't comfortably animate".
      setPerfOk(avg < 33);
    };
    rafId = requestAnimationFrame((now) => {
      last = now;
      rafId = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, []);

  return !reducedMotion && tabVisible && perfOk;
}
