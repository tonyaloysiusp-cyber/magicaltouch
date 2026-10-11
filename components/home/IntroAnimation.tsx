'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppTheme } from '@/hooks/useAppTheme';
import { useTemplateCountLabel } from '@/lib/templateCount';

// First-load brand intro, shown once per browser session (sessionStorage)
// and skipped entirely under prefers-reduced-motion.
//
//  0.0s  aurora in the brand spectrum; a spectrum ribbon paints across the
//        screen while little design pieces (palette, type, photo, cursor)
//        drift in like a workspace being set up
//  0.6s  the real logo icon pops out of the ribbon with a spark burst
//  1.1s  the wordmark is wiped in behind a light bar; the star twinkles
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
const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
  const d = 70 + (i % 4) * 22;
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, c: SPEC[i % SPEC.length], s: 4 + (i % 3) * 2, delay: (i % 5) * 18 };
});

export function IntroAnimation({ theme }: { theme: AppTheme }) {
  const [phase, setPhase] = useState<Phase>('pending');
  const logoRef = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const count = useTemplateCountLabel('1000+');

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

        <svg className="mti-ribbons" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="mti-spec" x1="0" x2="1" y1="0" y2="0">
              {SPEC.map((c, i) => (
                <stop key={c} offset={i / (SPEC.length - 1)} stopColor={c} />
              ))}
            </linearGradient>
          </defs>
          <path className="mti-ribbon mti-ribbon-1" pathLength={1} d="M -60 520 C 180 600 260 330 420 330 S 640 470 760 330 S 930 90 1080 120" />
          <path className="mti-ribbon mti-ribbon-2" pathLength={1} d="M -60 140 C 160 60 300 250 480 230 S 760 40 1080 210" />
        </svg>

        {/* Workspace pieces drifting in */}
        <div className="mti-chip mti-chip-palette">
          {SPEC.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </div>
        <div className="mti-chip mti-chip-type">
          <b>Aa</b>
          <span>Sora · Bold</span>
        </div>
        <div className="mti-chip mti-chip-card">
          <i className="mti-card-photo" />
          <i className="mti-card-line" />
          <i className="mti-card-line mti-short" />
        </div>
        <div className="mti-chip mti-chip-count">
          <b>{count}</b>
          <span>templates</span>
        </div>
        <div className="mti-cursor">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M4 3l15 7-6.5 2L10 19z" fill="#35C2F1" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span>You</span>
        </div>

        <span className="mti-skip">Tap to skip</span>
      </div>

      <div className="mti-center">
        <div ref={logoRef} className="mti-logo" style={flight ? { transform: flight } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mti-icon" src={src} alt="" draggable={false} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mti-word" src={src} alt="" draggable={false} />
          <span className="mti-bar" />
          <span className="mti-twinkle">
            <svg viewBox="0 0 40 40">
              <path d="M20 0 C21 14 26 19 40 20 C26 21 21 26 20 40 C19 26 14 21 0 20 C14 19 19 14 20 0z" fill="url(#mti-spec)" />
            </svg>
          </span>
          <span className="mti-sparks">
            {SPARKS.map((p, i) => (
              <i key={i} style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, background: p.c, width: p.s, height: p.s, animationDelay: `${620 + p.delay}ms` } as React.CSSProperties} />
            ))}
          </span>
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
.mti-leaving .mti-chip-palette,.mti-leaving .mti-chip-type{transform:translate(-40px,-40px) scale(.9)}
.mti-leaving .mti-chip-card,.mti-leaving .mti-chip-count{transform:translate(40px,40px) scale(.9)}
.mti-orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:0;animation:mti-fade 1.2s ease forwards, mti-drift 6s ease-in-out infinite alternate}
.mti-orb-a{width:46vmax;height:46vmax;left:-12vmax;top:-14vmax;background:radial-gradient(circle,#F2708F66,transparent 65%)}
.mti-orb-b{width:50vmax;height:50vmax;right:-16vmax;top:10vh;background:radial-gradient(circle,#35C2F155,transparent 65%);animation-delay:.15s,0s}
.mti-orb-c{width:40vmax;height:40vmax;left:20vw;bottom:-22vmax;background:radial-gradient(circle,#8CC84B4d,transparent 65%);animation-delay:.3s,0s}
.mti-grid{position:absolute;inset:-2px;opacity:0;background-image:linear-gradient(var(--soft) 1px,transparent 1px),linear-gradient(90deg,var(--soft) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:radial-gradient(ellipse at center,#000 10%,transparent 70%);mask-image:radial-gradient(ellipse at center,#000 10%,transparent 70%);animation:mti-fade .9s ease .1s forwards}
.mti-ribbons{position:absolute;inset:0;width:100%;height:100%}
.mti-ribbon{fill:none;stroke:url(#mti-spec);stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1}
.mti-ribbon-1{stroke-width:16;animation:mti-draw 1.05s cubic-bezier(.65,0,.25,1) .05s forwards, mti-settle .8s ease 1.3s forwards}
.mti-ribbon-2{stroke-width:5;opacity:.6;animation:mti-draw 1.2s cubic-bezier(.65,0,.25,1) .25s forwards, mti-settle .8s ease 1.4s forwards}
.mti-chip{position:absolute;display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:16px;background:var(--chip);border:1px solid var(--chipb);box-shadow:0 18px 40px -18px rgba(0,0,0,.35);backdrop-filter:blur(8px);color:var(--ink);font:500 12px/1.1 var(--font-body,system-ui),system-ui,sans-serif;opacity:0}
.mti-chip-palette{left:9vw;top:18vh;--r:-8deg;animation:mti-chip-in .8s cubic-bezier(.2,.9,.3,1.3) .35s forwards, mti-float 4s ease-in-out 1.2s infinite}
.mti-chip-palette i{width:18px;height:18px;border-radius:6px;display:block}
.mti-chip-type{right:10vw;top:16vh;--r:7deg;flex-direction:column;align-items:flex-start;gap:2px;animation:mti-chip-in .8s cubic-bezier(.2,.9,.3,1.3) .5s forwards, mti-float 4.6s ease-in-out 1.3s infinite}
.mti-chip-type b{font:700 26px/1 var(--font-display,system-ui),system-ui,sans-serif;background:linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1);-webkit-background-clip:text;background-clip:text;color:transparent}
.mti-chip-type span{opacity:.6;font-size:11px}
.mti-chip-card{left:13vw;bottom:15vh;--r:6deg;flex-direction:column;align-items:stretch;width:112px;gap:6px;animation:mti-chip-in .8s cubic-bezier(.2,.9,.3,1.3) .65s forwards, mti-float 5s ease-in-out 1.4s infinite}
.mti-card-photo{display:block;height:62px;border-radius:10px;background:linear-gradient(135deg,#A69BD3,#35C2F1 55%,#5DCCB8)}
.mti-card-line{display:block;height:7px;border-radius:4px;background:var(--chipb)}
.mti-short{width:60%}
.mti-chip-count{right:12vw;bottom:17vh;--r:-5deg;flex-direction:column;align-items:flex-start;gap:3px;animation:mti-chip-in .8s cubic-bezier(.2,.9,.3,1.3) .8s forwards, mti-float 4.2s ease-in-out 1.5s infinite}
.mti-chip-count b{font:600 20px/1 var(--font-display,system-ui),system-ui,sans-serif}
.mti-chip-count span{opacity:.6;font-size:11px}
.mti-cursor{position:absolute;left:68vw;top:62vh;display:flex;align-items:flex-start;gap:2px;opacity:0;animation:mti-cursor 1.9s cubic-bezier(.5,0,.2,1) .4s forwards}
.mti-cursor span{margin-top:16px;padding:3px 8px;border-radius:999px;background:#35C2F1;color:#fff;font:600 11px/1.2 system-ui,sans-serif}
.mti-center{position:absolute;z-index:1;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.mti-logo{position:relative;flex:none;width:min(680px,84vw);aspect-ratio:${1 / LOGO_RATIO};transform-origin:0 0;transition:transform .72s cubic-bezier(.7,0,.2,1)}
.mti-logo img{position:absolute;inset:0;width:100%;height:100%;user-select:none}
.mti-icon{clip-path:inset(0 ${(1 - ICON_SHARE) * 100}% 0 0);transform-origin:${ICON_SHARE * 50}% 55%;opacity:0;animation:mti-pop .75s cubic-bezier(.2,1.4,.35,1) .55s forwards}
.mti-word{clip-path:inset(0 100% 0 ${ICON_SHARE * 100}%);animation:mti-wipe .75s cubic-bezier(.65,0,.3,1) 1.05s forwards}
.mti-bar{position:absolute;top:-12%;bottom:-12%;width:3px;left:${ICON_SHARE * 100}%;border-radius:3px;background:linear-gradient(#F2708F,#35C2F1,#8CC84B);box-shadow:0 0 18px 4px rgba(53,194,241,.55);opacity:0;animation:mti-bar .75s cubic-bezier(.65,0,.3,1) 1.05s forwards}
.mti-twinkle{position:absolute;left:46%;top:-14%;width:9%;aspect-ratio:1;opacity:0;animation:mti-twinkle .9s ease 1.55s forwards}
.mti-twinkle svg{width:100%;height:100%}
.mti-sparks{position:absolute;left:${ICON_SHARE * 50}%;top:50%}
.mti-sparks i{position:absolute;border-radius:50%;opacity:0;animation:mti-spark .8s cubic-bezier(.1,.7,.3,1) forwards}
.mti-tag{margin-top:clamp(18px,3vw,28px);color:var(--ink);font:500 clamp(14px,1.6vw,18px)/1.3 var(--font-display,system-ui),system-ui,sans-serif;letter-spacing:.01em;opacity:0;transform:translateY(10px);animation:mti-up .6s ease 1.75s forwards}
.mti-tag em{font-style:normal;background:linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8);-webkit-background-clip:text;background-clip:text;color:transparent}
.mti-underline{margin-top:10px;height:3px;width:min(220px,50vw);border-radius:3px;background:linear-gradient(90deg,${SPEC.join(',')});transform:scaleX(0);animation:mti-grow .7s cubic-bezier(.65,0,.3,1) 1.95s forwards}
.mti-leaving .mti-icon{animation:none;opacity:1;transform:none;filter:none}
.mti-leaving .mti-word{animation:none;clip-path:inset(0 0 0 ${ICON_SHARE * 100}%)}
.mti-leaving .mti-bar,.mti-leaving .mti-twinkle,.mti-leaving .mti-sparks{display:none}
.mti-leaving .mti-tag,.mti-leaving .mti-underline{transition:opacity .3s ease;opacity:0!important}
.mti-skip{position:absolute;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);color:var(--ink);opacity:0;font:500 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;animation:mti-skip .5s ease 1s forwards}
@keyframes mti-fade{to{opacity:1}}
@keyframes mti-drift{to{transform:translate(3vw,2vh) scale(1.08)}}
@keyframes mti-draw{to{stroke-dashoffset:0}}
@keyframes mti-settle{to{opacity:.18}}
@keyframes mti-chip-in{0%{opacity:0;transform:translateY(30px) rotate(calc(var(--r) * 3)) scale(.7)}100%{opacity:1;transform:translateY(0) rotate(var(--r)) scale(1)}}
@keyframes mti-float{0%,100%{translate:0 0}50%{translate:0 -10px}}
@keyframes mti-cursor{0%{opacity:0;transform:translate(14vw,24vh)}25%{opacity:1}70%{opacity:1;transform:translate(-2vw,-3vh)}100%{opacity:1;transform:translate(0,0)}}
@keyframes mti-pop{0%{opacity:0;transform:scale(.3) rotate(-18deg);filter:blur(8px)}60%{opacity:1;filter:blur(0)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes mti-wipe{to{clip-path:inset(0 0 0 ${ICON_SHARE * 100}%)}}
@keyframes mti-bar{0%{opacity:0;left:${ICON_SHARE * 100}%}12%{opacity:1}85%{opacity:1}100%{opacity:0;left:100%}}
@keyframes mti-twinkle{0%{opacity:0;transform:scale(0) rotate(-90deg)}50%{opacity:1;transform:scale(1.25) rotate(10deg)}100%{opacity:0;transform:scale(.6) rotate(45deg)}}
@keyframes mti-spark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.2)}}
@keyframes mti-up{to{opacity:1;transform:translateY(0)}}
@keyframes mti-grow{to{transform:scaleX(1)}}
@keyframes mti-skip{to{opacity:.4}}
@media (max-width:640px){.mti-chip-type,.mti-chip-count{right:6vw}.mti-chip-palette,.mti-chip-card{left:6vw}.mti-chip-palette{top:14vh}.mti-chip-card{bottom:12vh;width:92px}.mti-cursor{left:60vw;top:64vh}}
      `}</style>
    </div>
  );
}
