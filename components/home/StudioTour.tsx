'use client';

// Home page: "Everything in one studio" — a tour of the tools beyond the
// basic editor, one tab each, built for phones first (nothing is a shrunk
// desktop screen):
//  · Pro menus   — the real File / Edit / Object / View… menus and shortcuts
//  · Brand kit   — logo, colours and fonts applied to a design in one tap
//  · Photo Studio — adjustments, filters and a before / after sweep
//  · Mockups     — real renders from the site's own mockup engine
//  · AI Studio   — paste any design, get an editable one
// Tabs advance on their own while the section is on screen; tapping a tab
// takes over. Reduced motion: still frames, no auto-advance.

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Brush, Check, ChevronRight, Contrast, Crop, Droplet, Eraser, Image as ImageIcon, Layers, Menu as MenuIcon, MousePointer2,
  Palette, Pipette, Sparkles, Sun, SunMoon, Thermometer, Type, Wand2,
} from 'lucide-react';
import { Reveal } from './Reveal';

type TabId = 'menus' | 'brand' | 'photo' | 'mockups' | 'ai';
const TABS: { id: TabId; label: string; icon: ReactNode; title: string; body: string; points: string[]; cta: [string, string] }[] = [
  { id: 'menus', label: 'Pro menus', icon: <MenuIcon size={16} />, title: 'Pro tools when you want them', body: 'Switch the editor to Pro for a full menu bar — the same File, Edit, Object, Type, Select and View menus designers know, with keyboard shortcuts.', points: ['Version history, preflight and print setup', 'Rulers, guides, grid and snapping', 'Group, align, lock and arrange layers'], cta: ['Open the editor', '/create'] },
  { id: 'brand', label: 'Brand kit', icon: <Palette size={16} />, title: 'Your brand, on every design', body: 'Save your logo, colours and fonts once. Apply them to any template in one tap — every post, flyer and card stays on-brand.', points: ['Logo, colour palette and heading / body fonts', 'One tap to restyle a whole template', 'Several brands for agencies and side projects'], cta: ['Set up your brand', '/create'] },
  { id: 'photo', label: 'Photo Studio', icon: <ImageIcon size={16} />, title: 'A photo editor in your browser', body: 'Enhance, retouch and crop photos with layers, brushes and real adjustments — then drop them straight into your design.', points: ['Auto enhance, filters and fine adjustments', 'Background removal, healing, dodge & burn', 'Layers, selections and print-ready export'], cta: ['Open Photo Studio', '/photo-studio'] },
  { id: 'mockups', label: 'Mockups', icon: <Layers size={16} />, title: 'See it in real life', body: 'Put any design on a wall, a phone, a T-shirt, a tote bag, business cards or a billboard — and download the picture for your client or your feed.', points: ['Rooms, print, screens and merch', 'Choose wall and accent colours', 'Made in your browser — nothing uploaded'], cta: ['Try mockups', '/create'] },
  { id: 'ai', label: 'AI Studio', icon: <Sparkles size={16} />, title: 'Paste any design. Edit it in a minute.', body: 'Found a flyer or invitation you love? Paste a screenshot and free AI — Claude, ChatGPT, Gemini and more — rebuilds it as a design you can change completely.', points: ['Recreate a layout, or just take inspiration', 'Uses free AI accounts — nothing to pay', 'Every word, colour and photo editable'], cta: ['Try the AI Studio', '/ai-studio'] },
];
const CYCLE = 9000;

export function StudioTour() {
  const [tab, setTab] = useState<TabId>('menus');
  const [t, setT] = useState(0); // ms into the current tab
  const [auto, setAuto] = useState(true);
  const [reduced, setReduced] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const visible = useRef(false);

  useEffect(() => {
    const r = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setReduced(!!r);
    if (r) setT(CYCLE - 1);
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { threshold: 0.25 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);

  const clock = useRef(0);
  const tabRef = useRef<TabId>('menus');
  useEffect(() => {
    if (reduced) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(100, now - last); last = now;
      if (visible.current) {
        clock.current += dt;
        if (clock.current >= CYCLE) {
          if (auto) {
            clock.current = 0;
            tabRef.current = TABS[(TABS.findIndex((x) => x.id === tabRef.current) + 1) % TABS.length].id;
            setTab(tabRef.current);
          } else clock.current = CYCLE - 1;
        }
        setT(clock.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto, reduced]);

  // Tapping a tab plays it once from the start, then stays on it.
  const pick = (id: TabId) => { tabRef.current = id; clock.current = 0; setTab(id); setT(0); setAuto(false); };
  const cur = TABS.find((x) => x.id === tab)!;

  return (
    <section id="studio" className="border-t border-mt-border">
      <div ref={box} className="mt-container py-16 sm:py-24">
        <Reveal>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-mt-muted">Everything in one studio</p>
          <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] font-medium text-3xl sm:text-5xl leading-[1.06] tracking-[-0.03em]">
            More than templates. <span className="mt-spectrum-text">A full design studio.</span>
          </h2>
        </Reveal>

        <div role="tablist" aria-label="Studio tools" className="mt-8 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((x) => {
            const on = x.id === tab;
            return (
              <button key={x.id} role="tab" aria-selected={on} onClick={() => pick(x.id)} className={`relative shrink-0 h-10 px-4 rounded-full text-[14px] font-medium inline-flex items-center gap-2 border overflow-hidden transition-colors ${on ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>
                {x.icon}{x.label}
                {on && auto && !reduced && <span aria-hidden className="absolute left-0 bottom-0 h-[2px] mt-spectrum" style={{ width: `${(t / CYCLE) * 100}%` }} />}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] items-center">
          <div key={tab} className="order-2 lg:order-1 mt-howto-pop">
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">{cur.title}</h3>
            <p className="mt-3 text-[15px] sm:text-base text-mt-muted leading-relaxed">{cur.body}</p>
            <ul className="mt-5 space-y-2.5">
              {cur.points.map((p) => <li key={p} className="flex gap-2.5 text-[14px] sm:text-[15px]"><Check size={18} className="shrink-0 text-emerald-600 mt-0.5" />{p}</li>)}
            </ul>
            <Link href={cur.cta[1]} className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-mt-primary px-5 text-[14px] font-semibold text-mt-onprimary">{cur.cta[0]} <ArrowRight size={16} /></Link>
          </div>
          <div className="order-1 lg:order-2" aria-hidden>
            <Window title={cur.label}>
              {tab === 'menus' && <MenusDemo t={t} />}
              {tab === 'brand' && <BrandDemo t={t} />}
              {tab === 'photo' && <PhotoDemo t={t} />}
              {tab === 'mockups' && <MockupsDemo t={t} />}
              {tab === 'ai' && <AiDemo t={t} />}
            </Window>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- shared

const ease = (x: number) => { const v = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - v, 3); };
const at = (t: number, ms: number, dur = 450) => ease((t - ms) / dur);

function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[20px] p-px mt-spectrum shadow-[0_40px_80px_-40px_rgba(9,9,11,0.45)]">
      <div className="rounded-[19px] overflow-hidden bg-mt-surface">
        <div className="h-9 flex items-center gap-1.5 px-3 border-b border-mt-border bg-mt-surface">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F2708F]" /><span className="h-2.5 w-2.5 rounded-full bg-[#DDE23B]" /><span className="h-2.5 w-2.5 rounded-full bg-[#5DCCB8]" />
          <span className="ml-3 text-[12px] text-mt-faint truncate">magicaltouchdesign.com · {title}</span>
        </div>
        <div className="relative aspect-[1/1.02] sm:aspect-[16/10] overflow-hidden bg-mt-studio">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pro menus

const MENUS: { name: string; items: [string, string?][] }[] = [
  { name: 'File', items: [['New Design'], ['Open…'], ['Save', '⌘S'], ['Save As…', '⇧⌘S'], ['Version History…'], ['Export…'], ['Mockups…'], ['Preflight…'], ['Document & Print Setup']] },
  { name: 'View', items: [['Zoom In', '⌘+'], ['Fit Page', '⌘0'], ['Show Bleed & Safe Area'], ['Show Rulers', '⌘R'], ['Show Grid'], ['Show Guides', '⌘;'], ['Snap to Objects'], ['Snap to Guides']] },
];
const BAR = ['File', 'Edit', 'Object', 'Type', 'Select', 'View', 'Window', 'Help'];

function MenusDemo({ t }: { t: number }) {
  const which = t < 4500 ? 0 : 1;
  const m = MENUS[which];
  const local = which ? t - 4500 : t;
  const hi = Math.min(m.items.length - 1, Math.floor(Math.max(0, local - 700) / 380));
  const showRulers = which === 1 && local > 3000;
  return (
    <div className="absolute inset-0 text-mt-ink">
      <div className="h-8 flex items-center gap-0.5 px-1.5 border-b border-mt-border bg-mt-surface text-[12px] sm:text-[13px] overflow-hidden whitespace-nowrap">
        {BAR.map((b) => <span key={b} className={`px-2 sm:px-2.5 h-7 grid place-items-center rounded ${b === m.name ? 'bg-mt-surface2 font-medium' : ''}`}>{b}</span>)}
        <span className="ml-auto hidden sm:inline-flex rounded-full border border-mt-border p-0.5 text-[11px]"><span className="px-2 py-0.5">Simple</span><span className="px-2 py-0.5 rounded-full bg-mt-primary text-mt-onprimary">Pro</span></span>
      </div>
      {showRulers && (
        <>
          <div className="absolute left-0 right-0 top-8 h-4 border-b border-mt-border bg-mt-surface" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgb(var(--mt-faint)) 0 1px, transparent 1px 12px)', backgroundSize: '100% 5px', backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom' }} />
          <div className="absolute left-0 top-12 bottom-0 w-4 border-r border-mt-border bg-mt-surface" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgb(var(--mt-faint)) 0 1px, transparent 1px 12px)', backgroundSize: '5px 100%', backgroundRepeat: 'repeat-y', backgroundPosition: 'right' }} />
          <div className="absolute top-12 bottom-0 w-px bg-[#35C2F1]" style={{ left: '58%' }} />
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/templates/collection/green-creative-marketing-agency-post-preview.jpg" alt="" className="absolute top-[18%] h-[74%] w-auto rounded shadow-xl" style={{ left: '48%' }} loading="lazy" />
      <div className="absolute top-8 w-[62%] sm:w-[44%] rounded-lg border border-mt-border bg-mt-surface shadow-2xl py-1 text-[12px] sm:text-[13px] mt-howto-pop" key={which} style={{ left: which ? '22%' : '1%' }}>
        {m.items.map(([l, k], i) => (
          <div key={l} className={`mx-1 px-2.5 h-[30px] sm:h-[28px] rounded flex items-center justify-between ${i === hi ? 'bg-[#2F6FE4] text-white font-medium' : 'text-mt-ink'}`}>
            <span className="truncate">{which === 1 && l === 'Show Rulers' && showRulers ? '✓ ' : ''}{l}</span>{k && <span className={`ml-3 text-[11px] ${i === hi ? 'text-white/80' : 'text-mt-faint'}`}>{k}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Brand kit

const KITS = [
  { name: 'Nimbus Labs', logo: 'N', colors: ['#0B1630', '#35C2F1', '#5DCCB8', '#F4F7FB'], head: 'Sora, sans-serif', headName: 'Sora', body: 'Inter' },
  { name: 'Bloom Café', logo: 'B', colors: ['#3A1E25', '#F2708F', '#F7D9C4', '#FFF8F2'], head: "Georgia, 'Playfair Display', serif", headName: 'Playfair Display', body: 'Lora' },
  { name: 'Dune Realty', logo: 'D', colors: ['#141414', '#C9A15A', '#E9E1D3', '#FAF7F0'], head: "'Cinzel', Georgia, serif", headName: 'Cinzel', body: 'Montserrat' },
];

function BrandDemo({ t }: { t: number }) {
  const k = t < 3000 ? 0 : t < 6000 ? 1 : 2;
  const kit = KITS[k];
  const press = (t % 3000) > 2200 && (t % 3000) < 2600;
  const [ink, accent, soft, paper] = kit.colors;
  return (
    <div className="absolute inset-0 flex">
      <div className="w-[44%] sm:w-[34%] shrink-0 border-r border-mt-border bg-mt-surface p-3 sm:p-4 text-mt-ink flex flex-col gap-3 text-[12px]">
        <p className="text-[13px] sm:text-[14px] font-semibold">Brand kit</p>
        <div className="flex gap-1.5 flex-wrap">{KITS.map((x, i) => <span key={x.name} className={`px-2 py-1 rounded-full border text-[11px] ${i === k ? 'border-[#3B82C4] text-[#3B82C4]' : 'border-mt-border text-mt-muted'}`}>{x.name}</span>)}</div>
        <div className="flex items-center gap-2"><span className="h-9 w-9 rounded-lg grid place-items-center text-white font-bold text-[16px] transition-colors duration-500" style={{ background: accent }}>{kit.logo}</span><span className="text-mt-muted">Logo</span></div>
        <div><p className="text-mt-muted mb-1.5">Colours</p><div className="flex gap-1.5">{kit.colors.map((c) => <span key={c} className="h-6 w-6 rounded-full border border-black/10 transition-colors duration-500" style={{ background: c }} />)}</div></div>
        <div><p className="text-mt-muted">Heading</p><p className="text-[15px] font-semibold" style={{ fontFamily: kit.head }}>{kit.headName}</p><p className="text-mt-muted mt-1">Body · {kit.body}</p></div>
        <span className={`mt-auto h-9 rounded-xl bg-mt-primary text-mt-onprimary font-semibold grid place-items-center transition-transform ${press ? 'scale-95' : ''}`}>Apply to design</span>
      </div>
      <div className="flex-1 grid place-items-center p-3 sm:p-6">
        <div className="relative w-full max-w-[260px] aspect-[4/5] rounded-md shadow-xl overflow-hidden transition-colors duration-700" style={{ background: paper }}>
          <div className="absolute inset-x-0 top-0 h-[46%] transition-colors duration-700" style={{ background: ink }} />
          <div className="absolute -right-6 top-[30%] h-24 w-24 rounded-full transition-colors duration-700" style={{ background: accent }} />
          <div className="absolute left-[8%] top-[7%] flex items-center gap-1.5"><span className="h-5 w-5 rounded grid place-items-center text-[10px] font-bold text-white transition-colors duration-700" style={{ background: accent }}>{kit.logo}</span><span className="text-[9px] font-semibold tracking-[0.16em] text-white/90">{kit.name.toUpperCase()}</span></div>
          <p className="absolute left-[8%] right-[30%] top-[18%] text-white leading-[1.05] font-bold text-[clamp(16px,4.2vw,24px)] transition-all duration-500" style={{ fontFamily: kit.head }}>Grand opening this weekend</p>
          <div className="absolute left-[8%] right-[30%] top-[52%] flex flex-col gap-1">
            {['20% off everything', 'Free coffee for the first 50', 'Saturday · 10 am'].map((x, i) => <span key={x} className={`text-[10px] sm:text-[11px] transition-colors duration-700 ${i ? 'hidden sm:block' : ''}`} style={{ color: ink }}>• {x}</span>)}
          </div>
          <span className="absolute left-[8%] bottom-[8%] rounded-full px-3 py-1 text-[10px] font-semibold text-white transition-colors duration-700" style={{ background: accent }}>Visit us →</span>
          <span className="absolute right-[8%] bottom-[8%] h-6 w-16 rounded transition-colors duration-700" style={{ background: soft }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Photo Studio

const TOOLS = [MousePointer2, Crop, Brush, Eraser, Wand2, Pipette, Droplet, SunMoon];
const SLIDERS: [ReactNode, string, number][] = [[<Sun key="s" size={13} />, 'Brightness', 0.62], [<Contrast key="c" size={13} />, 'Contrast', 0.7], [<Droplet key="d" size={13} />, 'Saturation', 0.66], [<Thermometer key="w" size={13} />, 'Warmth', 0.58]];

function PhotoDemo({ t }: { t: number }) {
  const sweep = 0.5 + 0.42 * Math.sin((t / CYCLE) * Math.PI * 2 - Math.PI / 2); // before/after line
  const grow = at(t, 400, 1600);
  const filter = t > 6200 ? 'Warm' : t > 4600 ? 'Vivid' : 'Auto enhance';
  const after = filter === 'Warm' ? 'brightness(1.08) contrast(1.12) saturate(1.3) sepia(.18)' : filter === 'Vivid' ? 'brightness(1.06) contrast(1.18) saturate(1.5)' : 'brightness(1.1) contrast(1.15) saturate(1.25)';
  const photo = '/templates/photos/pro/couple.jpg';
  return (
    <div className="absolute inset-0 flex text-mt-ink">
      <div className="w-10 sm:w-12 shrink-0 border-r border-mt-border bg-mt-surface flex flex-col items-center gap-1 pt-2">
        {TOOLS.map((I, i) => <span key={i} className={`h-8 w-8 rounded-lg grid place-items-center ${i === 4 ? 'bg-mt-surface2 text-[#3B82C4]' : 'text-mt-muted'}`}><I size={16} /></span>)}
      </div>
      <div className="relative flex-1 grid place-items-center p-2 sm:p-4">
        <div className="relative h-full max-h-full aspect-[4/5] rounded-md overflow-hidden shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'brightness(.88) contrast(.9) saturate(.75)' }} loading="lazy" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-700" style={{ filter: after, clipPath: `inset(0 0 0 ${sweep * 100}%)` }} loading="lazy" />
          <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow" style={{ left: `${sweep * 100}%` }}><span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-white shadow grid place-items-center text-[10px] text-black font-bold">⇆</span></div>
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">Before</span>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">After</span>
        </div>
      </div>
      <div className="hidden sm:flex w-[30%] shrink-0 border-l border-mt-border bg-mt-surface p-3 flex-col gap-3 text-[12px]">
        <p className="text-[13px] font-semibold">Adjust</p>
        <div className="flex flex-wrap gap-1.5">{['Auto enhance', 'Vivid', 'Warm', 'B&W'].map((f) => <span key={f} className={`px-2 py-1 rounded-full border ${f === filter ? 'border-[#3B82C4] text-[#3B82C4]' : 'border-mt-border text-mt-muted'}`}>{f}</span>)}</div>
        {SLIDERS.map(([ic, l, v]) => (
          <div key={l}><p className="flex items-center gap-1.5 text-mt-muted">{ic}{l}</p><div className="mt-1.5 h-1.5 rounded-full bg-mt-border relative"><span className="absolute left-0 top-0 h-full rounded-full bg-[#3B82C4]" style={{ width: `${(0.5 + (v - 0.5) * grow) * 100}%` }} /><span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white ring-2 ring-[#3B82C4]" style={{ left: `${(0.5 + (v - 0.5) * grow) * 100}%` }} /></div></div>
        ))}
        <span className="mt-auto h-9 rounded-xl bg-mt-primary text-mt-onprimary font-semibold grid place-items-center">Apply to design</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Mockups

const SHOTS: [string, string, string][] = [
  ['frame-wall', 'Framed on a wall', 'Print'], ['phone', 'Phone', 'Screens'], ['tote', 'Tote bag', 'Merch'], ['cards', 'Business cards', 'Print'],
  ['instagram', 'Instagram post', 'Screens'], ['tshirt', 'T-shirt', 'Merch'], ['room-living', 'Living room', 'Rooms'], ['laptop', 'Laptop', 'Screens'], ['billboard', 'Billboard', 'Print'],
];

function MockupsDemo({ t }: { t: number }) {
  const i = Math.min(SHOTS.length - 1, Math.floor(t / (CYCLE / SHOTS.length)));
  return (
    <div className="absolute inset-0 flex">
      <div className="relative flex-1 bg-[#E9E4DC]">
        {SHOTS.map(([id, name], j) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={`/home/mockups/${id}.webp`} alt={name} loading="lazy" className="absolute inset-0 h-full w-full object-contain transition-opacity duration-700" style={{ opacity: j === i ? 1 : 0 }} />
        ))}
        <span className="absolute left-3 bottom-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white">{SHOTS[i][1]} · {SHOTS[i][2]}</span>
      </div>
      <div className="hidden sm:flex w-[26%] shrink-0 border-l border-mt-border bg-mt-surface p-2.5 flex-col gap-2 overflow-hidden">
        <p className="text-[13px] font-semibold text-mt-ink px-0.5">Mockups</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SHOTS.slice(0, 8).map(([id, name], j) => (
            <span key={id} className={`aspect-square rounded-md overflow-hidden ring-2 ${j === i ? 'ring-[#3B82C4]' : 'ring-transparent'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/home/mockups/${id}.webp`} alt="" loading="lazy" className="h-full w-full object-cover" />
            </span>
          ))}
        </div>
        <span className="mt-auto h-9 rounded-xl bg-mt-primary text-mt-onprimary text-[12px] font-semibold grid place-items-center">Download picture</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- AI Studio

const AI_REF = '/templates/collection/sage-arch-wedding-invitation-preview.jpg';
const LAYERS = ['Names', 'Invitation line', 'Date & venue', 'Arch photo', 'Frame', 'Background'];

function AiDemo({ t }: { t: number }) {
  const scan = Math.max(0, Math.min(1, (t - 600) / 1800));
  const built = at(t, 2600, 600);
  const sel = Math.min(LAYERS.length - 1, Math.max(0, Math.floor((t - 4000) / 700)));
  const boxes: Record<string, [number, number, number, number]> = { Names: [16, 66, 68, 10], 'Invitation line': [14, 62, 72, 4], 'Date & venue': [22, 77, 56, 8], 'Arch photo': [24, 9, 52, 48], Frame: [5, 4, 90, 92], Background: [0, 0, 100, 100] };
  const b = boxes[LAYERS[sel]];
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-3 sm:gap-6 p-3 sm:p-6 text-mt-ink">
      <div className="relative w-[36%] sm:w-auto sm:h-[62%] aspect-[4/5] -rotate-3 rounded-md overflow-hidden shadow-xl shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AI_REF} alt="" className="h-full w-full object-cover grayscale-[.25] opacity-90" loading="lazy" />
        <div className="absolute inset-x-0 h-[3px] bg-[#5DCCB8] shadow-[0_0_14px_#5DCCB8]" style={{ top: `${scan * 100}%`, opacity: scan > 0 && scan < 1 ? 1 : 0 }} />
        <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">Screenshot</span>
      </div>
      <span className="text-2xl sm:text-3xl font-bold mt-spectrum-text shrink-0" style={{ opacity: at(t, 2200) }}>→</span>
      <div className="relative w-[44%] sm:w-auto sm:h-[74%] flex gap-2 sm:gap-3 shrink-0" style={{ opacity: built, transform: `scale(${0.94 + 0.06 * built})` }}>
        <div className="relative w-full sm:w-auto sm:h-full aspect-[4/5] rounded-md shadow-2xl ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AI_REF} alt="" className="h-full w-full object-cover rounded-md" loading="lazy" />
          {t > 4000 && <span className="absolute border-2 border-[#3B82C4] rounded-sm transition-all duration-300" style={{ left: `${b[0]}%`, top: `${b[1]}%`, width: `${b[2]}%`, height: `${b[3]}%` }}>{['-left-1 -top-1', '-right-1 -top-1', '-left-1 -bottom-1', '-right-1 -bottom-1'].map((c) => <span key={c} className={`absolute ${c} h-2 w-2 rounded-sm bg-white border-2 border-[#3B82C4]`} />)}</span>}
        </div>
        <div className="hidden sm:flex w-36 flex-col rounded-lg border border-mt-border bg-mt-surface p-2 text-[11px] self-center">
          <p className="font-semibold text-[12px] mb-1 inline-flex items-center gap-1"><Layers size={13} /> Layers</p>
          {LAYERS.map((l, i) => <span key={l} className={`px-1.5 py-1 rounded flex items-center gap-1.5 ${t > 4000 && i === sel ? 'bg-[#3B82C4]/10 text-[#3B82C4]' : 'text-mt-muted'}`}>{i < 3 ? <Type size={11} /> : <ImageIcon size={11} />}{l}<ChevronRight size={10} className="ml-auto opacity-40" /></span>)}
        </div>
        <span className="absolute -bottom-2 left-2 rounded-full bg-mt-primary px-2.5 py-1 text-[10px] font-semibold text-mt-onprimary shadow" style={{ opacity: at(t, 3200) }}>✓ Fully editable</span>
      </div>
    </div>
  );
}
