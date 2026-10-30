'use client';

// Home page: the AI Template Studio in one self-playing loop (~9 s).
// A reference picture is "scanned", an arrow appears, and the editable
// version builds itself piece by piece — frame, photo, names typed in,
// details — with selection handles, so visitors see it's a real design they
// can edit, not a picture. Pure HTML/CSS, a few KB; stays still for people
// who prefer reduced motion.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ImagePlus, Sparkles } from 'lucide-react';
import { Reveal } from './Reveal';

const REF = '/templates/collection/sage-arch-wedding-invitation-preview.jpg';
const NAME = 'Sara & Adam';
const LOOP = 9000;

export function AiShowcase() {
  const [t, setT] = useState(LOOP - 1); // reduced motion: show the finished state
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !box.current) return;
    // Only animate while on screen.
    let raf = 0, start = 0;
    const tick = (now: number) => { if (!start) start = now; setT((now - start) % LOOP); raf = requestAnimationFrame(tick); };
    const io = new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); if (e.isIntersecting) { start = 0; raf = requestAnimationFrame(tick); } }, { threshold: 0.2 });
    io.observe(box.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  const at = (ms: number, dur = 400) => Math.max(0, Math.min(1, (t - ms) / dur));
  const scan = Math.max(0, Math.min(1, (t - 400) / 1400));
  const typed = NAME.slice(0, Math.max(0, Math.min(NAME.length, Math.floor((t - 4200) / 110))));
  const sel = t > 4100 && t < 6200;

  return (
    <section className="border-t border-mt-border overflow-hidden">
      <div className="mt-container py-16 sm:py-20 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D97757]">New · AI Template Studio</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] font-medium text-3xl sm:text-5xl leading-[1.08] tracking-[-0.03em]">
            Paste any design.<br /><span className="mt-spectrum-text">Edit it in a minute.</span>
          </h2>
          <p className="mt-5 max-w-md text-[15px] sm:text-base text-mt-muted leading-relaxed">
            Found a flyer or invitation you love? Paste a screenshot — free AI like Claude, ChatGPT or Gemini rebuilds it as a design you can change completely: words, colours, fonts and photos.
          </p>
          <ul className="mt-6 space-y-2 text-[14px] text-mt-muted">
            <li className="flex gap-2"><ImagePlus size={17} className="shrink-0 text-mt-ink" /> Paste, drop or upload any picture — or just describe it</li>
            <li className="flex gap-2"><Sparkles size={17} className="shrink-0 text-mt-ink" /> Uses free AI accounts — nothing to pay, nothing to install</li>
          </ul>
          <Link href="/ai-studio" className="mt-8 inline-flex h-12 items-center gap-2 rounded-2xl bg-mt-primary px-6 font-semibold text-mt-onprimary">Try the AI Studio <ArrowRight size={17} /></Link>
        </Reveal>

        <div ref={box} className="relative mx-auto w-full max-w-[560px] aspect-[1.25/1]" aria-hidden>
          {/* reference */}
          <div className="absolute left-0 top-[8%] w-[42%] aspect-[4/5] -rotate-3 rounded-xl overflow-hidden shadow-2xl border border-mt-border bg-mt-surface2" style={{ opacity: at(0, 500) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={REF} alt="" className="h-full w-full object-cover grayscale-[.2]" loading="lazy" />
            <div className="absolute inset-x-0 h-[3px] bg-[#5DCCB8] shadow-[0_0_14px_#5DCCB8]" style={{ top: `${scan * 100}%`, opacity: scan > 0 && scan < 1 ? 1 : 0 }} />
            <span className="absolute left-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">Your inspiration</span>
          </div>
          {/* arrow */}
          <div className="absolute left-[44%] top-[40%] text-4xl font-bold mt-spectrum-text" style={{ opacity: at(1800), transform: `translateX(${(1 - at(1800)) * -12}px)` }}>→</div>
          {/* editable rebuild */}
          <div className="absolute right-0 top-0 w-[48%] aspect-[4/5] rotate-2 rounded-xl shadow-2xl" style={{ opacity: at(2200), background: '#A9B88F' }}>
            <div className="absolute inset-[6%] rounded-md bg-[#FBF8F1] border border-black/10" style={{ opacity: at(2400) }}>
              <div className="absolute left-[18%] right-[18%] top-[7%] h-[48%] rounded-t-full bg-no-repeat" style={{ backgroundImage: `url(${REF})`, backgroundSize: '200% auto', backgroundPosition: '50% 18%', opacity: at(2800), transform: `scale(${0.94 + 0.06 * at(2800)})` }} />
              <p className="absolute inset-x-0 top-[60%] text-center text-[8px] tracking-[0.2em] text-[#6b6b5f]" style={{ opacity: at(3300) }}>TOGETHER WITH THEIR FAMILIES</p>
              <div className={`absolute inset-x-[10%] top-[65%] text-center ${sel ? 'outline outline-2 outline-[#3B82C4] outline-offset-2 rounded-sm' : ''}`}>
                <p className="font-serif italic text-[clamp(16px,3.4vw,26px)] text-[#2f3a2a] min-h-[1.3em]">{t > 4200 ? typed : 'Layla & Omar'}<span className={sel && typed.length < NAME.length ? 'animate-pulse' : 'opacity-0'}>|</span></p>
                {sel && ['-left-1 -top-1', '-right-1 -top-1', '-left-1 -bottom-1', '-right-1 -bottom-1'].map((c) => <span key={c} className={`absolute ${c} h-2 w-2 rounded-sm bg-white border-2 border-[#3B82C4]`} />)}
              </div>
              <p className="absolute inset-x-0 top-[80%] text-center text-[8px] tracking-[0.18em] text-[#6b6b5f]" style={{ opacity: at(3600) }}>INVITE YOU TO CELEBRATE THEIR WEDDING</p>
              <p className="absolute inset-x-0 top-[86%] text-center font-serif text-[11px] text-[#2f3a2a]" style={{ opacity: at(3800) }}>Saturday, 17 April</p>
            </div>
            <span className="absolute -bottom-3 right-3 rounded-full bg-mt-primary px-3 py-1 text-[11px] font-semibold text-mt-onprimary shadow" style={{ opacity: at(6400) }}>✓ Editable design</span>
          </div>
        </div>
      </div>
    </section>
  );
}
