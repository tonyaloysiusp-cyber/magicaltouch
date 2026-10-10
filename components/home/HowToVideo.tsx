'use client';

// The home page tutorial: a real screen recording of the Magical Touch
// editor (no mock-up), playing on a loop with a caption for each step.
// Captions, the step bar and seeking are live HTML on top of the video,
// so they stay sharp and can be clicked. Pauses when scrolled away;
// people who ask for reduced motion get a poster and a play button.

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Sparkles } from 'lucide-react';

const STEPS = [
  { t: 0, title: 'Pick a template', sub: '700+ designs, ready in a tap' },
  { t: 3.1, title: 'Make the words yours', sub: 'Click any text and type' },
  { t: 11.5, title: 'Add a little magic', sub: 'Glow, neon, retro — one click' },
  { t: 23.4, title: 'Drop in your photo', sub: 'It fills the frame perfectly' },
  { t: 31.4, title: 'Translate in one click', sub: '35+ languages, the right fonts too' },
  { t: 51.6, title: 'Resize for anywhere', sub: 'Post to story — nothing stretched' },
  { t: 60.1, title: 'Download print-ready', sub: 'Vector PDF, sharp at any size' },
];

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export function HowToVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
  }, []);

  // Play only while on screen (and not paused by the person).
  useEffect(() => {
    const el = wrap.current, v = ref.current;
    if (!el || !v || reduced) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !userPaused) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, userPaused]);

  // Step + progress follow the video's clock.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      const t = v.currentTime;
      let i = 0;
      for (let k = 0; k < STEPS.length; k++) if (t >= STEPS[k].t) i = k;
      setStep((s) => (s === i ? s : i));
      if (bar.current && v.duration) bar.current.style.transform = `scaleX(${t / v.duration})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const on = () => setPlaying(true), off = () => setPlaying(false);
    v.addEventListener('play', on);
    v.addEventListener('pause', off);
    return () => { cancelAnimationFrame(raf); v.removeEventListener('play', on); v.removeEventListener('pause', off); };
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { setUserPaused(false); v.play().catch(() => {}); }
    else { setUserPaused(true); v.pause(); }
  };
  const jump = (i: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = STEPS[i].t + 0.05;
    setStep(i);
    if (v.paused) { setUserPaused(false); v.play().catch(() => {}); }
  };
  const s = STEPS[step];

  return (
    <div ref={wrap} className="relative bg-[#F1F3F6] dark:bg-black select-none">
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <video
          ref={ref}
          className="absolute inset-0 w-full h-full object-cover"
          poster="/media/howto-poster.jpg"
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Screen recording: designing a birthday post in the Magical Touch editor"
        >
          <source src="/media/howto.webm" type="video/webm" />
          <source src="/media/howto.mp4" type="video/mp4" />
        </video>
        {/* caption */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[7%] w-[min(92%,560px)]">
          <div key={step} className="mt-howto-caption relative mx-auto w-fit max-w-full rounded-2xl bg-black/75 dark:bg-black/80 backdrop-blur-md text-white px-4 sm:px-6 py-2.5 sm:py-3 shadow-2xl ring-1 ring-white/10">
            <span className="mt-howto-spark" aria-hidden><Sparkles size={18} /></span>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FE3FF]">Step {step + 1} of {STEPS.length}</p>
            <p className="text-[15px] sm:text-[20px] font-semibold leading-tight">{s.title}</p>
            <p className="text-[12px] sm:text-[14px] text-white/75">{s.sub}</p>
          </div>
        </div>
        {(!playing || reduced) && (
          <button onClick={toggle} aria-label="Play the tutorial" className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/70 text-white grid place-items-center shadow-2xl hover:scale-105 transition-transform">
            <Play size={30} className="ml-1" />
          </button>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-black/70 text-white text-[11px] font-semibold px-3 py-1 tracking-wide">How it works · real editor</span>
      </div>
      {/* steps */}
      <div className="relative flex items-center gap-1.5 px-2 sm:px-3 py-2 border-t border-mt-border bg-mt-surface overflow-x-auto mt-scroll">
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="shrink-0 w-8 h-8 rounded-full grid place-items-center text-mt-ink hover:bg-mt-surface2">
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        {STEPS.map((st, i) => (
          <button
            key={st.title}
            onClick={() => jump(i)}
            aria-current={i === step}
            className={cx('shrink-0 h-8 px-3 rounded-full text-[12px] font-medium transition-colors', i === step ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink hover:bg-mt-surface2')}
          >
            {i + 1}. {st.title}
          </button>
        ))}
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-mt-border" aria-hidden>
          <div ref={bar} className="h-full origin-left mt-spectrum" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </div>
  );
}
