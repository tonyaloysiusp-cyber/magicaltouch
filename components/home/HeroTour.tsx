'use client';

// Home hero: a self-playing product tour inside a studio window — templates,
// editing, brand colours, translation, Image Trace, Pattern Studio and
// print-ready export. Pure CSS/SVG animation with real templates; pauses on
// hover, can be stepped through, and stays still for reduced motion.

import { useEffect, useMemo, useState } from 'react';
import { Check, FileDown, Grid3x3, Languages, LayoutTemplate, Palette, PenTool, Type } from 'lucide-react';
import { DEFAULT_PATTERN, layout, svgDataUrl, tileSvg } from '@/lib/patterns';

const C = '/templates/collection/';
const SCENES = [
  { id: 'templates', icon: LayoutTemplate, label: 'Templates', title: 'Start from a professional template' },
  { id: 'text', icon: Type, label: 'Edit', title: 'Change every word and photo' },
  { id: 'brand', icon: Palette, label: 'Brand colours', title: 'Apply your brand in one tap' },
  { id: 'translate', icon: Languages, label: 'Translate', title: 'Translate into 37 languages' },
  { id: 'trace', icon: PenTool, label: 'Image Trace', title: 'Turn pictures into vectors' },
  { id: 'pattern', icon: Grid3x3, label: 'Patterns', title: 'Create seamless patterns' },
  { id: 'export', icon: FileDown, label: 'Export', title: 'Print-ready PDF with bleed' },
] as const;
const DUR = 3800;

const GRID = ['pro-northline-consulting-services-flyer', 'pro-maison-vera-autumn-edit-fashion-poster', 'pro-saffron-table-brunch-menu', 'bdp-black-and-gold-fortieth-invitation', 'pro-sage-garden-wedding-invitation', 'pro-atlas-and-co-architects-letterhead'];
const HEADLINES = [
  { t: 'Strategy that moves your business forward', dir: 'ltr', lang: 'English' },
  { t: 'استراتيجية تدفع أعمالك إلى الأمام', dir: 'rtl', lang: 'العربية' },
  { t: 'Une stratégie qui fait avancer votre entreprise', dir: 'ltr', lang: 'Français' },
  { t: 'आपके व्यवसाय को आगे बढ़ाने वाली रणनीति', dir: 'ltr', lang: 'हिन्दी' },
];
const BRANDS = [
  { name: 'Navy & gold', f: 'none', c: ['#14233B', '#E3A72F'] },
  { name: 'Emerald', f: 'hue-rotate(-60deg)', c: ['#0F3B33', '#4FC08D'] },
  { name: 'Plum', f: 'hue-rotate(55deg)', c: ['#2B1640', '#C17BE0'] },
  { name: 'Terracotta', f: 'hue-rotate(160deg) saturate(.9)', c: ['#3B1E14', '#E07A4F'] },
];

export function HeroTour() {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => { setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  useEffect(() => {
    if (paused || still) return;
    const t = setInterval(() => setTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [paused, still]);
  useEffect(() => {
    if (tick * 100 >= DUR) { setTick(0); setI((n) => (n + 1) % SCENES.length); }
  }, [tick]);

  const go = (k: number) => { setI(k); setTick(0); };
  const p = Math.min(1, (tick * 100) / DUR);            // progress through the scene
  const s = SCENES[i];
  const pat = useMemo(() => { const q = { ...DEFAULT_PATTERN, tile: 70, scale: 0.6 }; const L = layout(q); return { url: svgDataUrl(tileSvg(q)), w: L.w, h: L.h }; }, []);
  const brand = BRANDS[Math.min(BRANDS.length - 1, Math.floor(p * BRANDS.length))];
  const head = HEADLINES[Math.min(HEADLINES.length - 1, Math.floor(p * HEADLINES.length))];
  const typed = Math.round(Math.min(1, p * 1.6) * 34);

  return (
    <div className="relative mx-auto w-full max-w-[680px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <style>{`
        @keyframes mtt-in { from { opacity: 0; transform: translateY(10px) scale(.98) } to { opacity: 1; transform: none } }
        .mtt-in { animation: mtt-in .55s cubic-bezier(.2,.7,.2,1) both }
        @keyframes mtt-scroll { from { background-position: 0 0 } to { background-position: 140px 140px } }
        @keyframes mtt-blink { 50% { opacity: 0 } }
        @keyframes mtt-draw { from { stroke-dashoffset: 400 } to { stroke-dashoffset: 0 } }
        @media (prefers-reduced-motion: reduce) { .mtt-in { animation: none } }
      `}</style>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="mtt-poster"><feComponentTransfer><feFuncR type="discrete" tableValues="0 .35 .7 1" /><feFuncG type="discrete" tableValues="0 .35 .7 1" /><feFuncB type="discrete" tableValues="0 .35 .7 1" /></feComponentTransfer></filter>
      </svg>

      <div className="absolute -inset-6 rounded-[40px] opacity-50 blur-3xl" aria-hidden style={{ background: 'radial-gradient(60% 60% at 70% 30%, rgba(59,130,196,.35), transparent 70%), radial-gradient(50% 50% at 20% 80%, rgba(201,168,106,.3), transparent 70%)' }} />

      {/* Studio window */}
      <div className="relative rounded-[22px] border border-mt-border bg-mt-surface shadow-[0_40px_90px_-40px_rgba(15,23,42,0.55)] overflow-hidden" role="region" aria-roledescription="product tour" aria-label={`Feature ${i + 1} of ${SCENES.length}: ${s.title}`}>
        <div className="flex items-center gap-2 border-b border-mt-border px-4 h-10">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-3 text-[12px] font-medium text-mt-muted truncate">Magical Touch Studio — {s.label}</span>
          <span className="ml-auto hidden sm:inline text-[11px] text-mt-faint">Auto-saved</span>
        </div>
        <div className="grid grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[52px_minmax(0,1fr)_150px]">
          {/* rail */}
          <nav className="border-r border-mt-border py-3 flex flex-col items-center gap-2" aria-label="Tour steps">
            {SCENES.map((x, k) => (
              <button key={x.id} type="button" onClick={() => go(k)} aria-label={x.label} aria-current={k === i} className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${k === i ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:bg-mt-surface2'}`}>
                <x.icon size={16} />
              </button>
            ))}
          </nav>

          {/* canvas */}
          <div className="relative aspect-[4/3.6] bg-[#EEF1F5] dark:bg-[#0E1320] overflow-hidden">
            <div key={s.id} className="mtt-in absolute inset-0 grid place-items-center p-5">
              {s.id === 'templates' && (
                <div className="grid grid-cols-3 gap-2.5 w-full max-w-[380px]">
                  {GRID.map((g, k) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={g} src={`${C}${g}.${g.startsWith('bdp') ? 'jpg' : 'webp'}`} alt="" className="w-full aspect-[1/1.35] object-cover rounded-lg bg-white shadow-sm transition-all duration-500" style={{ outline: Math.floor(p * 6) === k ? '3px solid #3B82C4' : 'none', outlineOffset: 2, transform: Math.floor(p * 6) === k ? 'translateY(-4px)' : 'none' }} />
                  ))}
                </div>
              )}
              {s.id === 'text' && (
                <div className="relative h-full aspect-[1/1.414] rounded-md overflow-hidden shadow-xl bg-[#14233B]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${C}pro-northline-consulting-services-flyer.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute left-[7%] top-[24%] w-[46%] rounded bg-[#14233B] px-1 py-1 ring-2 ring-[#3B82C4]">
                    <p className="text-white font-bold leading-tight text-[clamp(11px,2.1vw,18px)]">{'Growth plans built for you'.slice(0, typed)}<span className="inline-block w-[2px] h-[1em] bg-white align-middle ml-0.5" style={{ animation: 'mtt-blink 1s steps(1) infinite' }} /></p>
                  </div>
                  <span className="absolute left-[7%] top-[20%] -translate-y-full rounded bg-[#3B82C4] px-1.5 py-0.5 text-[10px] font-semibold text-white">Headline</span>
                </div>
              )}
              {s.id === 'brand' && (
                <div className="flex items-center gap-4 h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${C}pro-northline-consulting-free-consultation-post.webp`} alt="" className="h-[86%] aspect-square object-cover rounded-xl shadow-xl transition-[filter] duration-700" style={{ filter: brand.f }} />
                  <div className="hidden sm:flex flex-col gap-2">
                    {BRANDS.map((b) => (
                      <span key={b.name} className={`flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${b === brand ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border bg-mt-surface text-mt-ink'}`}>
                        <i className="flex -space-x-1">{b.c.map((c) => <b key={c} className="h-3.5 w-3.5 rounded-full ring-2 ring-white" style={{ background: c }} />)}</i>{b.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {s.id === 'translate' && (
                <div className="w-full max-w-[400px] rounded-xl bg-[#14233B] p-6 text-white shadow-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#E3A72F]">Business advisory</p>
                  <p key={head.lang} dir={head.dir} className="mtt-in mt-3 text-[clamp(18px,3.2vw,28px)] font-bold leading-tight">{head.t}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {HEADLINES.map((h) => <span key={h.lang} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${h === head ? 'bg-[#E3A72F] text-[#14233B]' : 'bg-white/10 text-white/80'}`}>{h.lang}</span>)}
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/60">+33 more</span>
                  </div>
                </div>
              )}
              {s.id === 'trace' && (
                <div className="relative h-[88%] aspect-square rounded-xl overflow-hidden shadow-xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/templates/photos/pro/x_watch.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'url(#mtt-poster) saturate(1.2)' }} />
                  <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${Math.round(p * 100)}% 0 0)` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/templates/photos/pro/x_watch.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                  <div className="absolute inset-y-0 w-0.5 bg-[#3B82C4]" style={{ left: `${100 - Math.round(p * 100)}%` }} />
                  <span className="absolute right-2 top-2 rounded-full bg-[#3B82C4] px-2 py-0.5 text-[10px] font-semibold text-white">Vector · 8 colours</span>
                </div>
              )}
              {s.id === 'pattern' && (
                <div className="h-[88%] aspect-square rounded-xl shadow-xl" style={{ backgroundImage: `url("${pat.url}")`, backgroundSize: `${pat.w}px ${pat.h}px`, animation: still ? 'none' : 'mtt-scroll 6s linear infinite' }} />
              )}
              {s.id === 'export' && (
                <div className="relative h-[86%] aspect-[1/1.3]">
                  <svg viewBox="0 0 130 169" className="absolute -inset-[8%] h-[116%] w-[116%]" aria-hidden>
                    <path d="M0 15h9M0 154h9M121 15h9M121 154h9M15 0v9M115 0v9M15 160v9M115 160v9" stroke="currentColor" className="text-mt-ink" strokeWidth=".8" strokeDasharray="400" style={{ animation: still ? 'none' : 'mtt-draw 1.6s ease-out both' }} />
                  </svg>
                  <div className="absolute inset-0 bg-[#3B82C4]/15" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${C}bdp-black-and-gold-fortieth-invitation.jpg`} alt="" className="absolute inset-[4%] h-[92%] w-[92%] object-cover shadow-lg" />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full sm:translate-y-0 sm:bottom-3 rounded-xl bg-mt-surface border border-mt-border px-3 py-2 text-[11px] shadow-lg whitespace-nowrap">
                    <span className="font-semibold text-mt-ink">Print PDF</span> <span className="text-mt-muted">· CMYK · 3 mm bleed · crop marks</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* properties panel */}
          <aside className="hidden sm:block border-l border-mt-border p-3 text-[11px]">
            <p className="font-semibold text-mt-ink">{s.label}</p>
            <ul className="mt-3 space-y-2 text-mt-muted">
              {(s.id === 'templates' ? ['5,000+ designs', 'Print & digital', 'Matching sets'] :
                s.id === 'text' ? ['Fonts & effects', 'Curved text', 'Replace photos'] :
                s.id === 'brand' ? ['Logo', 'Brand colours', 'Brand fonts'] :
                s.id === 'translate' ? ['37 languages', 'Right-to-left', 'One undo step'] :
                s.id === 'trace' ? ['1–32 colours', 'Line drawing', 'Editable paths'] :
                s.id === 'pattern' ? ['10 repeat types', 'Product mockups', 'SVG & PNG'] :
                ['PDF · PNG · JPG', 'SVG · WebP · MP4', 'Bleed & marks']).map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check size={12} className="text-[#3B82C4] shrink-0" />{t}</li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5" aria-hidden>
              {[0.9, 0.7, 0.8, 0.55].map((w, k) => <div key={k} className="h-1.5 rounded-full bg-mt-surface2" style={{ width: `${w * 100}%` }} />)}
            </div>
          </aside>
        </div>
      </div>

      {/* caption + progress */}
      <div className="relative mt-4 flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[14px] font-semibold text-mt-ink truncate" aria-live="polite">{s.title}</p>
        <div className="flex gap-1.5" role="tablist" aria-label="Tour">
          {SCENES.map((x, k) => (
            <button key={x.id} type="button" role="tab" aria-selected={k === i} aria-label={x.label} onClick={() => go(k)} className="relative h-1.5 w-6 sm:w-8 overflow-hidden rounded-full bg-mt-border">
              <span className="absolute inset-y-0 left-0 bg-mt-ink" style={{ width: k < i ? '100%' : k === i ? `${p * 100}%` : '0%' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
