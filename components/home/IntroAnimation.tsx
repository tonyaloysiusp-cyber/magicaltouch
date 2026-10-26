'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppTheme } from '@/hooks/useAppTheme';

// First-load brand intro, shown once per browser session (sessionStorage)
// and skipped entirely under prefers-reduced-motion.
//
//  0.0s  soft aurora in the brand spectrum (nothing crosses the logo)
//  0.6s  the real logo icon pops in
//  1.1s  the wordmark is wiped in (nothing is drawn over the logo)
//  1.8s  tagline + spectrum underline
//  2.7s  hand-off: the logo flies to exactly where the navbar logo sits
//        while the stage dissolves, so the intro turns into the page
//        instead of just fading away
//
// Uses the site's real logo files only. Click, tap or Esc skips.

const INTRO_SESSION_KEY = 'magicaltouch:introShown';
const LOGO_RATIO = 403 / 2809; // logo.png height / width
const ICON_SHARE = 0.22; // the icon is the left ~22% of the logo file

type Phase = 'pending' | 'visible' | 'leaving' | 'done';

const SPEC = ['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B', '#DDE23B'];

export function IntroAnimation({ theme }: { theme: AppTheme }) {
  const [phase, setPhase] = useState<Phase>('pending');
  const logoRef = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const phaseRef = useRef<Phase>('pending');
  const leave = useCallback(() => {
    if (phaseRef.current !== 'visible') return;
    phaseRef.current = 'leaving';
    // FLIP the intro logo onto the navbar logo underneath the overlay.
    try {
      const from = logoRef.current?.getBoundingClientRect();
      const to = document.querySelector('header img[alt="Magical Touch"]')?.getBoundingClientRect();
      if (from && to && to.width > 0 && to.top < window.innerHeight) {
        const k = to.width / from.width;
        setFlight(`translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${k})`);
      }
    } catch {
      /* no navbar logo found: the logo simply fades with the stage */
    }
    setPhase('leaving');
    timers.current.push(setTimeout(() => setPhase('done'), 760));
  }, []);

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
      // Storage disabled: the intro replays next load — harmless.
    }
    phaseRef.current = 'visible';
    setPhase('visible');
    const t = timers.current;
    t.push(setTimeout(leave, 2750));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && leave();
    window.addEventListener('keydown', onKey);
    return () => {
      t.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
    };
  }, [leave]);

  if (phase === 'pending' || phase === 'done') return null;

  const dark = theme === 'dark';
  const src = dark ? '/logo-white.png' : '/logo.png';
  const leaving = phase === 'leaving';

  return (
    <div role="presentation" aria-hidden="true" data-intro-phase={phase} onClick={leave} className={`mti ${dark ? 'mti-dark' : ''} ${leaving ? 'mti-leaving' : ''}`}>
      <div className="mti-stage">
        <span className="mti-orb mti-orb-a" />
        <span className="mti-orb mti-orb-b" />
        <span className="mti-orb mti-orb-c" />
        <span className="mti-grid" />

        <span className="mti-skip">Tap to skip</span>
      </div>

      <div className="mti-center">
        <div ref={logoRef} className="mti-logo" style={flight ? { transform: flight } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mti-icon" src={src} alt="" draggable={false} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mti-word" src={src} alt="" draggable={false} />
        </div>
        <p className="mti-tag">
          Design anything. <em>Magically.</em>
        </p>
        <span className="mti-underline" />
      </div>


      <style>{`
.mti{position:fixed;inset:0;z-index:9999;cursor:pointer;--ink:#0E0E12;--bg:#ffffff;--soft:rgba(14,14,18,.06);--chip:rgba(255,255,255,.82);--chipb:rgba(14,14,18,.08)}
.mti-dark{--ink:#fff;--bg:#000;--soft:rgba(255,255,255,.07);--chip:rgba(22,22,26,.8);--chipb:rgba(255,255,255,.1)}
.mti-stage{position:absolute;inset:0;overflow:hidden;background:var(--bg);transition:opacity .7s ease .05s, filter .7s ease}
.mti-leaving{pointer-events:none}
.mti-leaving .mti-stage{opacity:0}
.mti-leaving .mti-stage>*{transition:transform .7s cubic-bezier(.6,0,.4,1),opacity .5s ease;opacity:0}
.mti-orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:0;animation:mti-fade 1.2s ease forwards, mti-drift 6s ease-in-out infinite alternate}
.mti-orb-a{width:46vmax;height:46vmax;left:-12vmax;top:-14vmax;background:radial-gradient(circle,#F2708F66,transparent 65%)}
.mti-orb-b{width:50vmax;height:50vmax;right:-16vmax;top:10vh;background:radial-gradient(circle,#35C2F155,transparent 65%);animation-delay:.15s,0s}
.mti-orb-c{width:40vmax;height:40vmax;left:20vw;bottom:-22vmax;background:radial-gradient(circle,#8CC84B4d,transparent 65%);animation-delay:.3s,0s}
.mti-grid{position:absolute;inset:-2px;opacity:0;background-image:linear-gradient(var(--soft) 1px,transparent 1px),linear-gradient(90deg,var(--soft) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:radial-gradient(ellipse at center,#000 10%,transparent 70%);mask-image:radial-gradient(ellipse at center,#000 10%,transparent 70%);animation:mti-fade .9s ease .1s forwards}
.mti-center{position:absolute;z-index:1;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.mti-logo{position:relative;flex:none;width:min(680px,84vw);aspect-ratio:${1 / LOGO_RATIO};transform-origin:0 0;transition:transform .72s cubic-bezier(.7,0,.2,1)}
.mti-logo img{position:absolute;inset:0;width:100%;height:100%;user-select:none}
.mti-icon{clip-path:inset(0 ${(1 - ICON_SHARE) * 100}% 0 0);transform-origin:${ICON_SHARE * 50}% 55%;opacity:0;animation:mti-pop .75s cubic-bezier(.2,1.4,.35,1) .55s forwards}
.mti-word{clip-path:inset(0 100% 0 ${ICON_SHARE * 100}%);animation:mti-wipe .75s cubic-bezier(.65,0,.3,1) 1.05s forwards}
.mti-tag{margin-top:clamp(18px,3vw,28px);color:var(--ink);font:500 clamp(14px,1.6vw,18px)/1.3 var(--font-display,system-ui),system-ui,sans-serif;letter-spacing:.01em;opacity:0;transform:translateY(10px);animation:mti-up .6s ease 1.75s forwards}
.mti-tag em{font-style:normal;background:linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8);-webkit-background-clip:text;background-clip:text;color:transparent}
.mti-underline{margin-top:10px;height:3px;width:min(220px,50vw);border-radius:3px;background:linear-gradient(90deg,${SPEC.join(',')});transform:scaleX(0);animation:mti-grow .7s cubic-bezier(.65,0,.3,1) 1.95s forwards}
.mti-leaving .mti-icon{animation:none;opacity:1;transform:none;filter:none}
.mti-leaving .mti-word{animation:none;clip-path:inset(0 0 0 ${ICON_SHARE * 100}%)}
.mti-leaving .mti-tag,.mti-leaving .mti-underline{transition:opacity .3s ease;opacity:0!important}
.mti-skip{position:absolute;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);color:var(--ink);opacity:0;font:500 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;animation:mti-skip .5s ease 1s forwards}
@keyframes mti-fade{to{opacity:1}}
@keyframes mti-drift{to{transform:translate(3vw,2vh) scale(1.08)}}
@keyframes mti-pop{0%{opacity:0;transform:scale(.3) rotate(-18deg);filter:blur(8px)}60%{opacity:1;filter:blur(0)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes mti-wipe{to{clip-path:inset(0 0 0 ${ICON_SHARE * 100}%)}}
@keyframes mti-up{to{opacity:1;transform:translateY(0)}}
@keyframes mti-grow{to{transform:scaleX(1)}}
@keyframes mti-skip{to{opacity:.4}}
      `}</style>
    </div>
  );
}
