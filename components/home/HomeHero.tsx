'use client';
// Home hero: a big, confident headline on the left and, on the right, a
// studio window that plays like a short product film — every tool in a few
// seconds each: free templates, editing, text styles, languages, face
// retouch, packaging, garments, vector trace, print sheets and download.
// Pure CSS/SVG animation with small images; pauses on hover, can be stepped
// through, and stays still for reduced motion. Below it, a "free" ticker.

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, Box, Check, Download, FileDown, Languages, LayoutTemplate, PenTool, Printer, Shirt, Smile, Type, Wand2 } from 'lucide-react';

const PackagingArt = dynamic(() => import('./StudioHero').then((m) => m.PackagingArt), { ssr: false });
const GarmentArt = dynamic(() => import('./StudioHero').then((m) => m.GarmentArt), { ssr: false });

const C = '/templates/collection/';
const SCENES = [
  { id: 'templates', icon: LayoutTemplate, label: 'Templates', word: 'FREE', title: 'Free templates for every occasion', side: ['Social, print & cards', 'Free to use', 'No watermark'] },
  { id: 'edit', icon: Type, label: 'Edit', word: 'EDIT', title: 'Change every word and photo', side: ['Fonts & colours', 'Replace photos', 'Brand kit'] },
  { id: 'styles', icon: Wand2, label: 'Text styles', word: 'STYLE', title: 'Text styles that stop the scroll', side: ['Gold, neon, 3D', 'Curved text', 'Stays editable'] },
  { id: 'translate', icon: Languages, label: 'Languages', word: 'ANY LANGUAGE', title: 'Type in 17+ scripts, translate into 37 languages', side: ['Right-to-left', 'Indian scripts', 'One tap'] },
  { id: 'retouch', icon: Smile, label: 'Photo Studio', word: 'RETOUCH', title: 'Retouch faces: lipstick, eyes and sculpt', side: ['Lip shades', 'Face shape', 'Skin retouch'] },
  { id: 'packaging', icon: Box, label: 'Packaging', word: 'PACKAGING', title: 'Real box dielines, ready for the printer', side: ['Tuck, mailer, tray…', 'Your exact size', 'DXF for die maker'] },
  { id: 'textile', icon: Shirt, label: 'Textile', word: 'TEXTILE', title: 'Garments as real pattern pieces', side: ['Polo, jersey, kurti', 'XS to XXXL', 'Team names'] },
  { id: 'trace', icon: PenTool, label: 'Image Trace', word: 'TRACE', title: 'Turn any picture into vectors', side: ['Logos & sketches', 'Editable paths', 'SVG · PDF · PNG'] },
  { id: 'print', icon: Printer, label: 'Print', word: 'PRINT', title: 'Print sheets with bleed and crop marks', side: ['CMYK PDF', 'Bleed & marks', 'Move → Copy'] },
  { id: 'export', icon: FileDown, label: 'Download', word: 'DOWNLOAD', title: 'Download free — no login, no watermark', side: ['PDF · PNG · JPG', 'SVG · TIFF · WebP', 'Saved on your device'] },
] as const;
const DUR = 3400;

const GRID = ['pro-northline-consulting-services-flyer.webp', 'pro-maison-vera-autumn-edit-fashion-poster.webp', 'pro-saffron-table-brunch-menu.webp', 'bdp-black-and-gold-fortieth-invitation.jpg', 'pro-sage-garden-wedding-invitation.webp', 'pro-atlas-and-co-architects-letterhead.webp'];
const HEADLINES = [
  { t: 'Strategy that moves your business forward', dir: 'ltr', lang: 'English' },
  { t: 'استراتيجية تدفع أعمالك إلى الأمام', dir: 'rtl', lang: 'العربية' },
  { t: 'உங்கள் வணிகத்தை முன்னேற்றும் உத்தி', dir: 'ltr', lang: 'தமிழ்' },
  { t: 'आपके व्यवसाय को आगे बढ़ाने वाली रणनीति', dir: 'ltr', lang: 'हिन्दी' },
];
const STYLES: { name: string; css: CSSProperties; bg: string }[] = [
  { name: 'Gold', bg: '#1B1712', css: { backgroundImage: 'linear-gradient(180deg,#FFF1B8 0%,#E8B64C 45%,#9A6A12 60%,#F7D77A 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 2px 0 #5a3d06)' } },
  { name: 'Neon', bg: '#0B0B1A', css: { color: '#fff', textShadow: '0 0 6px #ff4fd8, 0 0 14px #ff4fd8, 0 0 28px #b03cff' } },
  { name: '3D Block', bg: '#FFE45C', css: { color: '#F2708F', textShadow: '1px 1px 0 #16161F, 2px 2px 0 #16161F, 3px 3px 0 #16161F, 4px 4px 0 #16161F, 5px 5px 0 #16161F, 6px 6px 0 #16161F' } },
  { name: 'Outline', bg: '#E9F7FF', css: { color: 'transparent', WebkitTextStroke: '2px #1D6FB8' } },
];
const LIPS = ['#C2435E', '#9C2B45', '#E07A8F', '#7E2F3C'];
const FREE = ['Free templates', 'Free design editor', 'Free Photo Studio', 'Free packaging dielines', 'Free garment patterns', 'Free vector trace', 'Free print files', 'Free translation', 'No sign-up', 'No login', 'No watermark'];

function HeroReel() {
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
  useEffect(() => { if (tick * 100 >= DUR) { setTick(0); setI((n) => (n + 1) % SCENES.length); } }, [tick]);

  const go = (k: number) => { setI(k); setTick(0); };
  const p = still ? 1 : Math.min(1, (tick * 100) / DUR);
  const s = SCENES[i];
  const head = HEADLINES[Math.min(HEADLINES.length - 1, Math.floor(p * HEADLINES.length))];
  const style = STYLES[Math.min(STYLES.length - 1, Math.floor(p * STYLES.length))];
  const lip = LIPS[Math.min(LIPS.length - 1, Math.floor(p * LIPS.length))];
  const typed = Math.round(Math.min(1, p * 1.6) * 26);
  const cards = Math.min(9, Math.floor(p * 11));
  const second = p > 0.5;

  return (
    <div className="relative mx-auto w-full max-w-[680px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <style>{`
        @keyframes mhr-in { from { opacity: 0; transform: translateY(10px) scale(.98) } to { opacity: 1; transform: none } }
        .mhr-in { animation: mhr-in .55s cubic-bezier(.2,.7,.2,1) both }
        @keyframes mhr-pop { 0% { opacity: 0; transform: translateY(14px) scale(.8) } 60% { opacity: 1; transform: translateY(-2px) scale(1.04) } 100% { opacity: 1; transform: none } }
        .mhr-pop { animation: mhr-pop .6s cubic-bezier(.2,.8,.2,1) .25s both }
        @keyframes mhr-blink { 50% { opacity: 0 } }
        @keyframes mhr-draw { from { stroke-dashoffset: 400 } to { stroke-dashoffset: 0 } }
        @keyframes mhr-card { from { opacity: 0; transform: translate(-14px,-10px) scale(.9) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .mhr-in, .mhr-pop { animation: none } }
      `}</style>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="mhr-poster"><feComponentTransfer><feFuncR type="discrete" tableValues="0 .35 .7 1" /><feFuncG type="discrete" tableValues="0 .35 .7 1" /><feFuncB type="discrete" tableValues="0 .35 .7 1" /></feComponentTransfer></filter>
      </svg>

      <div className="absolute -inset-6 rounded-[40px] opacity-50 blur-3xl" aria-hidden style={{ background: 'radial-gradient(55% 55% at 75% 25%, rgba(53,194,241,.35), transparent 70%), radial-gradient(50% 50% at 20% 85%, rgba(242,112,143,.3), transparent 70%), radial-gradient(40% 40% at 90% 90%, rgba(140,200,75,.28), transparent 70%)' }} />

      <div className="relative rounded-[22px] p-[1.5px] mt-spectrum shadow-[0_40px_90px_-40px_rgba(15,23,42,0.55)]"><div className="relative overflow-hidden rounded-[21px] bg-mt-surface" role="region" aria-roledescription="product film" aria-label={`Feature ${i + 1} of ${SCENES.length}: ${s.title}`}>
        <div className="flex h-10 items-center gap-2 border-b border-mt-border px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-3 truncate text-[12px] font-medium text-mt-muted">Magical Touch Studio — {s.label}</span>
          <span className="ml-auto hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-600 sm:inline">Free · no login</span>
        </div>
        <div className="grid grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[52px_minmax(0,1fr)_150px]">
          <nav className="flex flex-col items-center gap-1.5 border-r border-mt-border py-3" aria-label="Film scenes">
            {SCENES.map((x, k) => (
              <button key={x.id} type="button" onClick={() => go(k)} aria-label={x.label} aria-current={k === i} className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${k === i ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:bg-mt-surface2'}`}>
                <x.icon size={15} />
              </button>
            ))}
          </nav>

          <div className="relative aspect-[4/3.9] overflow-hidden bg-[#EEF1F5] dark:bg-[#0E1320]">
            <div key={s.id} className="mhr-in absolute inset-0 grid place-items-center p-5 pb-12">
              {s.id === 'templates' && (
                <div className="grid w-full max-w-[380px] grid-cols-3 gap-2.5">
                  {GRID.map((g, k) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={g} src={C + g} alt="" className="aspect-[1/1.35] w-full rounded-lg bg-white object-cover shadow-sm transition-all duration-500" style={{ outline: Math.floor(p * 6) === k ? '3px solid #3B82C4' : 'none', outlineOffset: 2, transform: Math.floor(p * 6) === k ? 'translateY(-4px)' : 'none' }} />
                  ))}
                </div>
              )}
              {s.id === 'edit' && (
                <div className="relative aspect-[1/1.414] h-full overflow-hidden rounded-md bg-[#14233B] shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${C}pro-northline-consulting-services-flyer.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute left-[5%] top-[24%] h-[30%] w-[48%] rounded bg-[#14233B] px-1.5 py-1 ring-2 ring-[#3B82C4]">
                    <p className="text-[clamp(11px,2.1vw,18px)] font-bold leading-tight text-white">{'Growth plans built for you'.slice(0, typed)}<span className="ml-0.5 inline-block h-[1em] w-[2px] bg-white align-middle" style={{ animation: 'mhr-blink 1s steps(1) infinite' }} /></p>
                  </div>
                  <span className="absolute left-[7%] top-[20%] -translate-y-full rounded bg-[#3B82C4] px-1.5 py-0.5 text-[10px] font-semibold text-white">Headline</span>
                </div>
              )}
              {s.id === 'styles' && (
                <div className="flex w-full max-w-[400px] flex-col items-center gap-4">
                  <div className="grid aspect-[16/10] w-full place-items-center rounded-2xl shadow-xl transition-colors duration-500" style={{ background: style.bg }}>
                    <span key={style.name} className="mhr-in font-[family-name:var(--font-display)] text-[clamp(34px,7vw,64px)] font-black tracking-tight" style={style.css}>MAGIC</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {STYLES.map((x) => <span key={x.name} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${x === style ? 'bg-mt-ink text-mt-bg' : 'bg-mt-surface text-mt-muted'}`}>{x.name}</span>)}
                  </div>
                </div>
              )}
              {s.id === 'translate' && (
                <div className="w-full max-w-[400px] rounded-xl bg-[#14233B] p-6 text-white shadow-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#E3A72F]">Business advisory</p>
                  <p key={head.lang} dir={head.dir} className="mhr-in mt-3 text-[clamp(18px,3.2vw,28px)] font-bold leading-tight">{head.t}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {HEADLINES.map((h) => <span key={h.lang} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${h === head ? 'bg-[#E3A72F] text-[#14233B]' : 'bg-white/10 text-white/80'}`}>{h.lang}</span>)}
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/60">+33 more</span>
                  </div>
                </div>
              )}
              {s.id === 'retouch' && (
                <div className="flex h-full w-full max-w-[420px] items-center gap-3">
                  <svg viewBox="0 0 120 150" className="h-full flex-1 drop-shadow-xl" aria-hidden>
                    <defs><linearGradient id="mhr-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FDE7F0" /><stop offset="1" stopColor="#E3F4FB" /></linearGradient></defs>
                    <rect width="120" height="150" rx="12" fill="url(#mhr-bg)" />
                    <path d="M24 60C20 30 40 12 60 12C82 12 100 30 96 60C98 90 100 118 104 142H16C20 118 22 90 24 60Z" fill="#3A2A22" />
                    <path d="M48 118h24v18c-6 4-18 4-24 0Z" fill="#E9C3AB" />
                    <path d="M30 150c4-12 16-16 30-16s26 4 30 16Z" fill="#F2708F" />
                    <path d="M60 22C36 22 28 44 30 66C32 94 44 118 60 124C76 118 88 94 90 66C92 44 84 22 60 22Z" fill="#F3D2BC" stroke="#16161F" strokeWidth="1" style={{ transform: `scaleX(${1 - 0.07 * p})`, transformOrigin: '60px 70px', transition: 'transform .1s linear' }} />
                    <path d="M30 52C32 30 46 20 62 20C80 20 92 32 90 52C82 40 70 34 56 36C46 38 36 44 30 52Z" fill="#3A2A22" />
                    <path d="M42 60q7-4 14 0M64 60q7-4 14 0" stroke="#16161F" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                    <ellipse cx="49" cy="67" rx={3.4 + p * 0.9} ry={2.1 + p * 0.5} fill="#16161F" /><ellipse cx="71" cy="67" rx={3.4 + p * 0.9} ry={2.1 + p * 0.5} fill="#16161F" />
                    <path d="M60 72v13q-3 3 0 4" stroke="#16161F" strokeWidth=".9" fill="none" strokeLinecap="round" />
                    <path d="M50 100q10-6 20 0q-10 8-20 0Z" fill={lip} style={{ transition: 'fill .4s' }} />
                    {[[37, 66], [83, 66], [44, 106], [76, 106], [60, 120]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="1.6" fill="#35C2F1" opacity={p > k * 0.12 ? 1 : 0} />)}
                  </svg>
                  <div className="w-[44%] space-y-2.5 rounded-xl bg-mt-surface p-3 text-[10.5px] shadow-lg">
                    <p className="font-semibold text-mt-ink">Face &amp; sculpt</p>
                    <div><p className="text-mt-muted">Lip shade</p><div className="mt-1 flex gap-1.5">{LIPS.map((c) => <span key={c} className="h-4 w-4 rounded-full" style={{ background: c, outline: c === lip ? '2px solid #16161F' : 'none', outlineOffset: 1 }} />)}</div></div>
                    {[['Eye size', p], ['Slim face', p * 0.8], ['Skin smoothing', 0.5]].map(([n, v]) => (
                      <div key={n as string}><p className="text-mt-muted">{n}</p><div className="mt-1 h-1.5 rounded-full bg-mt-surface2"><div className="h-full rounded-full bg-[#F2708F]" style={{ width: `${20 + (v as number) * 55}%` }} /></div></div>
                    ))}
                  </div>
                </div>
              )}
              {s.id === 'packaging' && (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/home/reel/packaging.webp" alt="" className="absolute inset-0 m-auto max-h-full max-w-full rounded-lg object-contain shadow-lg transition-opacity duration-700" style={{ opacity: second ? 0 : 1 }} />
                  <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: second ? 1 : 0 }}>{second && <PackagingArt />}</div>
                  <span className="absolute right-1 top-1 rounded-full bg-mt-surface px-2 py-0.5 text-[10px] font-semibold text-mt-ink shadow">{second ? 'Folded box' : 'Flat dieline'}</span>
                </div>
              )}
              {s.id === 'textile' && (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/home/reel/textile.webp" alt="" className="absolute inset-0 m-auto max-h-full max-w-full rounded-lg object-contain shadow-lg transition-opacity duration-700" style={{ opacity: second ? 0 : 1 }} />
                  <div className="absolute inset-0 p-2 transition-opacity duration-700" style={{ opacity: second ? 1 : 0 }}>{second && <GarmentArt />}</div>
                  <span className="absolute right-1 top-1 rounded-full bg-mt-surface px-2 py-0.5 text-[10px] font-semibold text-mt-ink shadow">{second ? 'Finished garment' : 'Pattern pieces'}</span>
                </div>
              )}
              {s.id === 'trace' && (
                <div className="relative aspect-square h-[92%] overflow-hidden rounded-xl bg-white shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/templates/photos/pro/x_watch.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'url(#mhr-poster) saturate(1.2)' }} />
                  <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${Math.round(p * 100)}% 0 0)` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/templates/photos/pro/x_watch.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                  <div className="absolute inset-y-0 w-0.5 bg-[#3B82C4]" style={{ left: `${100 - Math.round(p * 100)}%` }} />
                  <span className="absolute right-2 top-2 rounded-full bg-[#3B82C4] px-2 py-0.5 text-[10px] font-semibold text-white">Vector</span>
                </div>
              )}
              {s.id === 'print' && (
                <div className="relative flex h-full items-center gap-3">
                  <div className="relative grid aspect-[210/297] h-full grid-cols-3 content-center gap-[4%] bg-white p-[7%] shadow-xl">
                    {Array.from({ length: 9 }, (_, k) => (
                      <div key={k} className="relative aspect-[85/55] rounded-[2px] bg-[#14233B]" style={{ opacity: k < cards ? 1 : 0, animation: k < cards ? 'mhr-card .35s ease-out both' : 'none' }}>
                        <span className="absolute left-[10%] top-[22%] h-[14%] w-[40%] rounded-sm bg-[#E3A72F]" />
                        <span className="absolute bottom-[22%] left-[10%] h-[8%] w-[60%] rounded-sm bg-white/60" />
                      </div>
                    ))}
                    {[['left-[3%] top-[3%]'], ['right-[3%] top-[3%]'], ['left-[3%] bottom-[3%]'], ['right-[3%] bottom-[3%]']].map(([c]) => <span key={c} className={`absolute h-3 w-3 border-mt-ink ${c} ${c.includes('left') ? 'border-l' : 'border-r'} ${c.includes('top') ? 'border-t' : 'border-b'}`} />)}
                  </div>
                  <div className="hidden w-[150px] rounded-xl border border-mt-border bg-mt-surface p-2.5 text-[10.5px] shadow-lg sm:block">
                    <p className="font-semibold text-mt-ink">Move</p>
                    <p className="mt-1.5 flex justify-between text-mt-muted">Horizontal <b className="text-mt-ink">{cards % 3 === 0 && cards ? '0 mm' : '90 mm'}</b></p>
                    <p className="flex justify-between text-mt-muted">Vertical <b className="text-mt-ink">{cards % 3 === 0 && cards ? '60 mm' : '0 mm'}</b></p>
                    <div className="mt-2 grid grid-cols-2 gap-1"><span className="rounded-md bg-mt-ink py-1 text-center font-semibold text-mt-bg">Copy</span><span className="rounded-md border border-mt-border py-1 text-center">OK</span></div>
                  </div>
                </div>
              )}
              {s.id === 'export' && (
                <div className="relative aspect-[1/1.3] h-[86%]">
                  <svg viewBox="0 0 130 169" className="absolute -inset-[8%] h-[116%] w-[116%]" aria-hidden>
                    <path d="M0 15h9M0 154h9M121 15h9M121 154h9M15 0v9M115 0v9M15 160v9M115 160v9" stroke="currentColor" className="text-mt-ink" strokeWidth=".8" strokeDasharray="400" style={{ animation: still ? 'none' : 'mhr-draw 1.6s ease-out both' }} />
                  </svg>
                  <div className="absolute inset-0 bg-[#3B82C4]/15" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${C}bdp-black-and-gold-fortieth-invitation.jpg`} alt="" className="absolute inset-[4%] h-[92%] w-[92%] object-cover shadow-lg" />
                  <div className="absolute -right-3 top-[18%] flex flex-col gap-1.5 sm:-right-14">
                    {['PDF', 'PNG', 'JPG', 'SVG'].map((f, k) => <span key={f} className="rounded-lg bg-mt-surface px-2.5 py-1 text-[11px] font-bold text-mt-ink shadow-md" style={{ opacity: p > k * 0.15 ? 1 : 0, transform: p > k * 0.15 ? 'none' : 'translateX(10px)', transition: 'all .35s' }}>{f}</span>)}
                  </div>
                </div>
              )}
            </div>
            {/* Ad-style caption word */}
            <span key={`w-${s.id}`} className="mhr-pop pointer-events-none absolute bottom-3 left-3 rounded-xl bg-mt-ink px-3 py-1.5 font-[family-name:var(--font-display)] text-[clamp(14px,2.4vw,20px)] font-bold tracking-tight text-mt-bg shadow-lg">
              {s.word}<span className="mt-spectrum-text">.</span>
            </span>
          </div>

          <aside className="hidden border-l border-mt-border p-3 text-[11px] sm:block">
            <p className="font-semibold text-mt-ink">{s.label}</p>
            <ul className="mt-3 space-y-2 text-mt-muted">
              {s.side.map((t) => <li key={t} className="flex items-center gap-1.5"><Check size={12} className="shrink-0 text-[#3B82C4]" />{t}</li>)}
            </ul>
            <div className="mt-4 space-y-1.5" aria-hidden>
              {[0.9, 0.7, 0.8, 0.55].map((w, k) => <div key={k} className="h-1.5 rounded-full bg-mt-surface2" style={{ width: `${w * 100}%` }} />)}
            </div>
            <p className="mt-6 rounded-lg bg-mt-surface2 p-2 text-[10.5px] leading-snug text-mt-muted"><Download size={11} className="mr-1 inline" />Your files stay on your device.</p>
          </aside>
        </div>
      </div></div>

      <div className="relative mt-4 flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-mt-ink" aria-live="polite">{s.title}</p>
        <div className="flex gap-1" role="tablist" aria-label="Scenes">
          {SCENES.map((x, k) => (
            <button key={x.id} type="button" role="tab" aria-selected={k === i} aria-label={x.label} onClick={() => go(k)} className="relative h-1.5 w-4 overflow-hidden rounded-full bg-mt-border sm:w-6">
              <span className="absolute inset-y-0 left-0 mt-spectrum" style={{ width: k < i ? '100%' : k === i ? `${p * 100}%` : '0%' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-mt-bg">
      <style>{`
        @keyframes mhh-lift { from { transform: translate3d(0,18px,0) } to { transform: none } }
        .mhh-lift { animation: mhh-lift .9s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes mhh-rise { from { opacity: 0; transform: translate3d(0,24px,0) } to { opacity: 1; transform: none } }
        .mhh-rise { animation: mhh-rise .9s cubic-bezier(.2,.7,.2,1) .15s both; }
        @keyframes mhh-ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .mhh-ticker { animation: mhh-ticker 38s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .mhh-lift, .mhh-rise, .mhh-ticker { animation: none !important } }
      `}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-25" style={{ backgroundImage: 'linear-gradient(to right, rgb(var(--mt-border-rgb,228 228 231) / .55) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--mt-border-rgb,228 228 231) / .55) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 80% 70% at 30% 30%, #000 40%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 30% 30%, #000 40%, transparent 100%)' }} />

      <div className="relative mt-container grid gap-14 pb-14 pt-12 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center">
        <div className="mhh-lift">
          <p className="inline-flex items-center gap-2 rounded-full border border-mt-border bg-mt-surface/80 px-3.5 py-1.5 text-[12px] font-semibold tracking-wide text-mt-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full mt-spectrum" aria-hidden /> 100% free · no sign-up · no login
          </p>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-[2.5rem] font-medium leading-[1.05] tracking-[-0.035em] text-mt-ink sm:text-[3.6rem] lg:text-[4.1rem]">
            Design anything.{' '}
            <span className="mt-spectrum-text">Free for everyone.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-mt-muted sm:text-lg">
            Templates, a design editor, Photo Studio, packaging dielines, garment patterns, vector trace and print-ready files with bleed and crop marks. Just open it and create — no account, no watermark, and your files stay on your device.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/create" className="inline-flex h-12 items-center gap-2 rounded-full bg-mt-primary px-6 text-[15px] font-semibold text-mt-onprimary shadow-[0_12px_30px_-12px_rgba(9,9,11,0.55)] transition-transform hover:-translate-y-0.5">
              Start designing <ArrowRight size={16} />
            </Link>
            <Link href="/templates" className="inline-flex h-12 items-center gap-2 rounded-full border border-mt-border bg-mt-surface px-6 text-[15px] font-semibold text-mt-ink transition-colors hover:border-mt-ink/40">
              Explore free templates
            </Link>
          </div>
          <ul className="mt-9 grid max-w-xl grid-cols-1 gap-x-6 gap-y-2.5 text-[14px] text-mt-muted sm:grid-cols-3">
            {['No sign-up or login', 'No watermark', 'Files stay on your device'].map((t, k) => (
              <li key={t} className="inline-flex items-center gap-2"><Check size={16} className="shrink-0" style={{ color: ['#F2708F', '#35C2F1', '#8CC84B'][k] }} aria-hidden /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="mhh-rise"><HeroReel /></div>
      </div>

      {/* "Free" ticker */}
      <div className="relative overflow-hidden border-y border-mt-border bg-mt-ink py-3.5 text-mt-bg" aria-label="Everything is free">
        <div className="mhh-ticker flex w-max gap-8 whitespace-nowrap">
          {[...FREE, ...FREE].map((t, k) => (
            <span key={k} className="inline-flex items-center gap-8 font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight sm:text-[17px]" aria-hidden={k >= FREE.length}>
              {t}<span className="h-2 w-2 rounded-full mt-spectrum" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
