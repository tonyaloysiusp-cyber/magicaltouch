'use client';
// Home hero: a big, confident headline on the left and, on the right, a
// studio window that plays like a short product film — every tool in a few
// seconds each: free templates, editing, text styles, languages, face
// retouch, packaging, garments, vector trace, print sheets and download.
// Pure CSS/SVG animation with small images; pauses on hover, can be stepped
// through, and stays still for reduced motion. Below it, a "free" ticker.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { ArrowRight, Box, Check, Download, FileDown, Languages, LayoutTemplate, PenTool, Printer, Shirt, Smile, Type, Wand2 } from 'lucide-react';

const PackagingArt = dynamic(() => import('./StudioHero').then((m) => m.PackagingArt), { ssr: false });
const GarmentArt = dynamic(() => import('./StudioHero').then((m) => m.GarmentArt), { ssr: false }) as ComponentType<{ id?: string }>;

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
type Fx = { name: string; word: string; bg: string; cls: string; css: CSSProperties; deco?: ReactNode };
const FX: Fx[] = [
  { name: 'Gold', word: 'Luxe', bg: 'radial-gradient(circle at 50% 40%, #2A2216 0%, #0E0B07 75%)', cls: 'text-[clamp(44px,9vw,84px)] italic font-semibold', css: { fontFamily: "'Fraunces', Georgia, serif", backgroundImage: 'linear-gradient(180deg,#FFF3C4 0%,#F0C866 38%,#A8761C 55%,#F9DE8C 78%,#C08A2E 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 3px 0 #4A3206) drop-shadow(0 10px 18px rgba(0,0,0,.5))' } },
  { name: 'Neon tube', word: 'Open late', bg: 'linear-gradient(160deg,#1B1026 0%,#0B0B14 100%)', cls: 'text-[clamp(30px,6vw,56px)] font-bold tracking-tight', css: { fontFamily: "'Poppins', sans-serif", color: '#FFE6FA', textShadow: '0 0 4px #fff, 0 0 10px #FF4FD8, 0 0 22px #FF4FD8, 0 0 40px #B03CFF, 0 0 70px #B03CFF' }, deco: <span className="absolute inset-[10%] rounded-2xl border-2 border-[#35C2F1]" style={{ boxShadow: '0 0 12px #35C2F1, inset 0 0 12px #35C2F1' }} /> },
  { name: 'Retro', word: 'SUMMER', bg: '#FFF1D6', cls: 'text-[clamp(34px,7.5vw,68px)] font-black italic tracking-tight', css: { fontFamily: "'Unbounded', sans-serif", color: '#FFF1D6', WebkitTextStroke: '2px #2B2D42', textShadow: '4px 4px 0 #EF476F, 8px 8px 0 #FFD166, 12px 12px 0 #06D6A0' }, deco: <span className="absolute -bottom-[40%] left-1/2 h-[90%] aspect-square -translate-x-1/2 rounded-full" style={{ background: 'repeating-linear-gradient(180deg,#FFB86B 0 9%,transparent 9% 14%)' }} /> },
  { name: 'Sticker', word: 'NEW!', bg: 'linear-gradient(135deg,#7CDCF8 0%,#B7A8FF 100%)', cls: 'text-[clamp(40px,9vw,80px)] font-black -rotate-6', css: { fontFamily: "'Unbounded', sans-serif", color: '#F2708F', WebkitTextStroke: '3px #fff', paintOrder: 'stroke fill', filter: 'drop-shadow(0 0 0 #fff) drop-shadow(4px 6px 0 rgba(22,22,31,.35))' } },
  { name: 'Chrome', word: 'FUTURE', bg: 'linear-gradient(180deg,#0B1F3A 0%,#1B3B6F 60%,#0B1F3A 100%)', cls: 'text-[clamp(32px,7vw,64px)] font-black tracking-tight', css: { fontFamily: "'Unbounded', sans-serif", backgroundImage: 'linear-gradient(180deg,#FFFFFF 0%,#C9D6E3 42%,#4B5D73 50%,#E8F0F8 62%,#8FA3B8 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 2px 0 #0B1F3A) drop-shadow(0 0 14px rgba(53,194,241,.45))' } },
];
const KURTIS = [{ id: 'kurti-floral', name: 'Floral' }, { id: 'kurti-yoke', name: 'Paisley' }, { id: 'kurti-chevron', name: 'Chevron' }];
const FAN = ['pro-maison-vera-autumn-edit-fashion-poster.webp', 'pro-saffron-table-brunch-menu.webp', 'pro-sage-garden-wedding-invitation.webp'];
const EMBLEM = '<circle cx="50" cy="50" r="40" fill="#1D3557"/><path d="M50 22C61 35 61 52 50 64C39 52 39 35 50 22Z" fill="#F2708F"/><path d="M50 64C37 61 27 51 25 37C38 39 47 49 50 64Z" fill="#F7A1C4"/><path d="M50 64C63 61 73 51 75 37C62 39 53 49 50 64Z" fill="#F7A1C4"/><path d="M28 71Q50 59 72 71Q50 80 28 71Z" fill="#8CC84B"/>';
const EMBLEM_URL = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="22" height="22">${EMBLEM}</svg>`);
const EMBLEM_NODES = [[50, 22], [61, 44], [50, 64], [39, 44], [25, 37], [75, 37], [28, 71], [72, 71], [50, 77]];
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
  const fx = FX[Math.min(FX.length - 1, Math.floor(p * FX.length))];
  const kurti = KURTIS[Math.min(KURTIS.length - 1, Math.floor(p * KURTIS.length))].id;
  const ph = Math.min(3, Math.floor(p * 4)), sub = Math.min(1, p * 4 - ph);
  const look = [
    { img: '/home/reel/face-vline.jpg', panel: 'Face shape · V-line', rows: [['Slim face', 0.42 * sub], ['Slim jaw', 0.54 * sub], ['Chin length', 0.24 * sub]] as [string, number][], opacity: sub, filter: 'none', swatch: false },
    { img: '/home/reel/face-lips.jpg', panel: 'Lipstick · Rose lips', rows: [['Lip colour', 0.48], ['Fuller lips', 0.3]] as [string, number][], opacity: 1, filter: 'none', swatch: true },
    { img: '/home/reel/face-eyes.jpg', panel: 'Eyes · Big bright eyes', rows: [['Eye size', 0.48], ['Brighten eye whites', 0.42], ['Iris clarity', 0.48]] as [string, number][], opacity: 1, filter: 'none', swatch: false },
    { img: '/home/reel/face-glam.jpg', panel: 'Layer opacity & warmth', rows: [['Opacity', sub], ['Warmth', 0.2]] as [string, number][], opacity: sub, filter: 'sepia(.1) saturate(1.08)', swatch: false },
  ][ph];
  const typed = Math.round(Math.min(1, p * 1.6) * 26);
  const cards = Math.min(8, Math.floor(p * 10));
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
                <div className="flex w-full max-w-[420px] flex-col items-center gap-4">
                  <div key={fx.name} className="mhr-in relative grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-2xl shadow-xl" style={{ background: fx.bg }}>
                    {fx.deco}
                    <span className={`relative ${fx.cls}`} style={fx.css}>{fx.word}</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {FX.map((x) => <span key={x.name} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${x === fx ? 'bg-mt-ink text-mt-bg' : 'bg-mt-surface text-mt-muted'}`}>{x.name}</span>)}
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
                <div className="flex h-full w-full max-w-[440px] items-center gap-3">
                  <div className="relative h-full flex-1 overflow-hidden rounded-xl bg-[#1B1B22] shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/home/reel/face-original.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img key={look.img} src={look.img} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300" style={{ opacity: look.opacity, filter: look.filter }} />
                    <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">Real result · Photo Studio</span>
                  </div>
                  <div className="w-[44%] space-y-2.5 rounded-xl bg-mt-surface p-3 text-[10.5px] shadow-lg">
                    <p className="font-semibold text-mt-ink">{look.panel}</p>
                    {look.rows.map(([n, v]) => (
                      <div key={n}><p className="flex justify-between text-mt-muted"><span>{n}</span><b className="tabular-nums text-mt-ink">{Math.round(v * 100)}</b></p><div className="mt-1 h-1.5 rounded-full bg-mt-surface2"><div className="h-full rounded-full bg-[#F2708F]" style={{ width: `${Math.max(4, v * 100)}%` }} /></div></div>
                    ))}
                    {look.swatch && <div className="flex gap-1.5">{LIPS.map((c) => <span key={c} className="h-4 w-4 rounded-full" style={{ background: c, outline: c === LIPS[0] ? '2px solid #16161F' : 'none', outlineOffset: 1 }} />)}</div>}
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
                  <div key={kurti} className="mhr-in absolute inset-0 p-1"><GarmentArt id={kurti} /></div>
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    {KURTIS.map((k) => <span key={k.id} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shadow ${k.id === kurti ? 'bg-mt-ink text-mt-bg' : 'bg-mt-surface text-mt-muted'}`}>{k.name}</span>)}
                  </div>
                </div>
              )}
              {s.id === 'trace' && (
                <div className="relative aspect-square h-[92%] overflow-hidden rounded-xl bg-white shadow-xl">
                  <div className="absolute inset-0 grid place-items-center bg-[#FFF8EE]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={EMBLEM_URL} alt="" width={22} height={22} style={{ imageRendering: 'pixelated', transform: 'scale(11)', transformOrigin: 'center' }} />
                  </div>
                  <div className="absolute inset-0 bg-white" style={{ clipPath: `inset(0 0 0 ${Math.round((1 - p) * 100)}%)` }}>
                    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
                      <g dangerouslySetInnerHTML={{ __html: EMBLEM }} />
                      {EMBLEM_NODES.map(([x, y], k) => <rect key={k} x={x - 1.4} y={y - 1.4} width="2.8" height="2.8" fill="#fff" stroke="#3B82C4" strokeWidth=".6" />)}
                    </svg>
                  </div>
                  <div className="absolute inset-y-0 w-0.5 bg-[#3B82C4]" style={{ left: `${Math.round((1 - p) * 100)}%` }} />
                  <span className="absolute left-2 top-2 rounded-full bg-mt-ink/80 px-2 py-0.5 text-[10px] font-semibold text-white">Pixels</span>
                  <span className="absolute right-2 top-2 rounded-full bg-[#3B82C4] px-2 py-0.5 text-[10px] font-semibold text-white">Vector · 4 colours</span>
                </div>
              )}
              {s.id === 'print' && (
                <div className="relative flex h-full items-center gap-3">
                  <div className="relative aspect-[210/297] h-full bg-white shadow-xl">
                    <div className="absolute inset-[9%] grid grid-cols-2 content-start gap-[6%]">
                      {Array.from({ length: 8 }, (_, k) => (
                        <div key={k} className="relative aspect-[85/55]" style={{ opacity: k < cards ? 1 : 0, animation: k < cards ? 'mhr-card .35s ease-out both' : 'none' }}>
                          <div className="absolute -inset-[5%] bg-[#F2708F]/25" />
                          <div className="absolute inset-0 overflow-hidden rounded-[1px]" style={{ background: 'linear-gradient(135deg,#0F1B2D 0%,#1D3557 100%)' }}>
                            <span className="absolute left-[9%] top-[18%] grid h-[34%] aspect-square place-items-center rounded-full border border-[#E3B341] font-serif text-[clamp(5px,0.9vw,9px)] italic text-[#E3B341]">A</span>
                            <span className="absolute left-[9%] bottom-[30%] h-[7%] w-[46%] rounded-sm bg-white/85" />
                            <span className="absolute left-[9%] bottom-[16%] h-[5%] w-[30%] rounded-sm bg-[#E3B341]" />
                            <span className="absolute right-0 top-0 h-full w-[26%]" style={{ background: 'repeating-linear-gradient(45deg,#E3B341 0 1px,transparent 1px 5px)', opacity: 0.35 }} />
                          </div>
                          {[['-left-[14%] top-0 w-[10%] border-t'], ['-left-[14%] bottom-0 w-[10%] border-b'], ['-right-[14%] top-0 w-[10%] border-t'], ['-right-[14%] bottom-0 w-[10%] border-b'], ['left-0 -top-[20%] h-[14%] border-l'], ['right-0 -top-[20%] h-[14%] border-r'], ['left-0 -bottom-[20%] h-[14%] border-l'], ['right-0 -bottom-[20%] h-[14%] border-r']].map(([c]) => <span key={c} className={`absolute border-[#16161F] ${c}`} />)}
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-[3%] left-[9%] right-[9%] flex items-center gap-1">
                      {['#00AEEF', '#EC008C', '#FFF200', '#16161F'].map((c) => <span key={c} className="h-2 w-3" style={{ background: c }} />)}
                      <span className="ml-1 truncate text-[6px] text-mt-faint">85 × 55 mm · 3 mm bleed · CMYK</span>
                    </div>
                    {[['left-1/2 top-[1.5%]'], ['left-1/2 bottom-[7%]']].map(([c]) => <span key={c} className={`absolute ${c} h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-[#16161F]`} style={{ background: 'linear-gradient(#16161F,#16161F) center/100% 1px no-repeat, linear-gradient(#16161F,#16161F) center/1px 100% no-repeat' }} />)}
                  </div>
                  <div className="hidden w-[150px] rounded-xl border border-mt-border bg-mt-surface p-2.5 text-[10.5px] shadow-lg sm:block">
                    <p className="font-semibold text-mt-ink">Move</p>
                    <p className="mt-1.5 flex justify-between text-mt-muted">Horizontal <b className="text-mt-ink">{cards % 2 === 1 ? '95 mm' : '−95 mm'}</b></p>
                    <p className="flex justify-between text-mt-muted">Vertical <b className="text-mt-ink">{cards % 2 === 1 ? '0 mm' : '65 mm'}</b></p>
                    <div className="mt-2 grid grid-cols-2 gap-1"><span className="rounded-md bg-mt-ink py-1 text-center font-semibold text-mt-bg">Copy</span><span className="rounded-md border border-mt-border py-1 text-center">OK</span></div>
                    <p className="mt-2 flex items-center gap-1 text-mt-muted"><span className="h-2 w-3 bg-[#F2708F]/40" /> Bleed</p>
                  </div>
                </div>
              )}
              {s.id === 'export' && (
                <div className="relative flex h-full w-full max-w-[420px] items-center justify-center">
                  {FAN.map((f, k) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={f} src={C + f} alt="" className="absolute h-[70%] rounded-md bg-white object-cover shadow-xl transition-transform duration-700" style={{ aspectRatio: '1/1.35', transform: `translateX(${(k - 1) * Math.min(1, p * 2) * 62}%) rotate(${(k - 1) * Math.min(1, p * 2) * 8}deg) translateY(${k === 1 ? -4 : 6}%)`, zIndex: k === 1 ? 2 : 1 }} />
                  ))}
                  <div className="absolute bottom-[2%] left-1/2 z-[3] w-[86%] -translate-x-1/2 rounded-xl border border-mt-border bg-mt-surface p-2.5 text-[11px] shadow-xl">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white"><Check size={13} /></span>
                      <p className="min-w-0 flex-1 truncate font-semibold text-mt-ink">{p < 0.8 ? 'Downloading 3 files…' : 'Saved on your device'}</p>
                      <span className="flex gap-1">{['PDF', 'PNG', 'SVG'].map((f, k) => <b key={f} className="rounded bg-mt-surface2 px-1.5 py-0.5 text-[9.5px]" style={{ opacity: p > 0.2 + k * 0.2 ? 1 : 0.3 }}>{f}</b>)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mt-surface2"><div className="h-full mt-spectrum" style={{ width: `${Math.min(100, p * 125)}%` }} /></div>
                    <p className="mt-1.5 text-[10px] text-mt-muted">No login · no watermark · print PDF in CMYK</p>
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
        <div className="mhh-lift min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-medium leading-[1.08] tracking-[-0.035em] text-mt-ink min-[400px]:text-[2.3rem] sm:text-[3.4rem] lg:text-[3.9rem]">
            Design anything.{' '}
            <span className="mt-spectrum-text">Free for everyone.</span>
          </h1>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="What is free">
            {['100% free', 'No login', 'Free export', 'No watermark'].map((t, k) => (
              <li key={t} className="inline-flex items-center gap-2 rounded-full border border-mt-border bg-mt-surface px-4 py-2 font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight text-mt-ink shadow-sm sm:text-[18px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ['#F2708F', '#A69BD3', '#35C2F1', '#8CC84B'][k] }} aria-hidden />{t}
              </li>
            ))}
          </ul>
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
        <div className="mhh-rise min-w-0"><HeroReel /></div>
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
