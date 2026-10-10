'use client';

// A looping, self-playing tutorial inside a replica of the editor
// (about 70 seconds). An animated cursor picks a template, edits the
// words, tries colours, applies a brand kit (and resets it), drops in a
// photo, downloads a print-ready vector PDF and resizes for Instagram.
// Everything is drawn with HTML/CSS, so it is sharp at every size, needs
// no video file and costs almost nothing to load.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutTemplate, Shapes, Type, Image as ImageIcon, Palette, Upload, Undo2, Redo2, Download, Eye, Search,
  Check, FileText, FileImage, Link2, Pause, Play, Maximize2, RotateCcw, Sparkles, Lock, AlignLeft, Square,
} from 'lucide-react';

const W = 1200, H = 680;

type Pal = { bg: string; sun: string; ink: string; pill: string; pillInk: string; font: string };
const P0: Pal = { bg: '#1D4ED8', sun: '#FBBF24', ink: '#FFFFFF', pill: '#F97316', pillInk: '#FFFFFF', font: 'var(--font-display), system-ui, sans-serif' };
const P1: Pal = { ...P0, bg: '#FCE7F3', sun: '#EC4899', ink: '#831843', pill: '#EC4899' };
const P2: Pal = { ...P0, bg: '#0F766E', sun: '#5EEAD4', ink: '#F0FDFA', pill: '#F59E0B' };
const P3: Pal = { ...P0, bg: '#111827', sun: '#A3E635', ink: '#F9FAFB', pill: '#A3E635', pillInk: '#111827' };
const BRAND: Pal = { bg: '#2E1065', sun: '#E8B04B', ink: '#FDF4FF', pill: '#F9A8D4', pillInk: '#2E1065', font: 'Georgia, "Times New Roman", serif' };
const SWATCH_POS = [{ id: 'sw1', p: P1 }, { id: 'sw2', p: P2 }, { id: 'sw3', p: P3 }];

const STEPS = ['Template', 'Words', 'Colours', 'Brand', 'Photo', 'Download', 'Resize'];

interface S {
  step: number;
  caption: string;
  cx: number; cy: number; click: number; down: boolean;
  panel: 'templates' | 'brand' | 'uploads';
  loaded: boolean;
  title: string;
  sel: 'title' | null;
  pal: Pal;
  brand: boolean;
  toast: string | null;
  photo: boolean;
  drag: boolean;
  menu: 'none' | 'formats' | 'pdf';
  progress: number;
  saved: boolean;
  story: boolean;
  resize: boolean;
  fade: boolean;
  target: string | null;
}
const START: S = {
  step: 0, caption: 'Pick a template', cx: 640, cy: 420, click: 0, down: false, panel: 'templates', loaded: false, title: 'Summer Party',
  sel: null, pal: P0, brand: false, toast: null, photo: false, drag: false, menu: 'none', progress: 0, saved: false, story: false, resize: false, fade: false, target: null,
};

type Ev = [number, Partial<S> | ((s: S) => Partial<S>)];

function buildTimeline(): { evs: Ev[]; total: number } {
  const evs: Ev[] = [];
  let t = 0;
  const at = (ms: number, p: Ev[1]) => evs.push([ms, p]);
  // Move the cursor to an element marked data-t="id" (measured at run time) or to x, y.
  const move = (ms: number, x: number | string, y = 0) => at(ms, typeof x === 'string' ? { target: x } : { cx: x, cy: y, target: null });
  const click = (ms: number) => { at(ms, { down: true }); at(ms + 160, (s) => ({ down: false, click: s.click + 1 })); };

  // 1 — template
  at(0, { ...START, fade: false });
  move(700, 'thumb0');
  click(1900);
  at(2100, { loaded: true });
  // 2 — words
  t = 4800;
  at(t, { step: 1, caption: 'Change the words — just click and type' });
  move(t + 500, 'title');
  click(t + 1500);
  at(t + 1700, { sel: 'title' });
  const from = 'Summer Party', to = "Aisha's 30th";
  for (let i = 1; i <= from.length; i++) at(t + 2200 + i * 70, { title: from.slice(0, from.length - i) });
  for (let i = 1; i <= to.length; i++) at(t + 3200 + i * 150, { title: to.slice(0, i) });
  move(t + 5600, 870, 600);
  click(t + 6400);
  at(t + 6600, { sel: null });
  // 3 — colours
  t = 12000;
  at(t, { step: 2, caption: 'Try any colour — the whole design follows' });
  SWATCH_POS.forEach((sw, i) => {
    move(t + 400 + i * 1900, sw.id);
    click(t + 1300 + i * 1900);
    at(t + 1450 + i * 1900, { pal: sw.p });
  });
  // 4 — brand
  t = 19500;
  at(t, { step: 3, caption: 'Apply your brand in one click' });
  move(t + 400, 'rail-brand');
  click(t + 1300);
  at(t + 1450, { panel: 'brand' });
  move(t + 2300, 'apply');
  click(t + 3200);
  at(t + 3350, { pal: BRAND, brand: true, toast: 'Brand applied — colours, fonts and logo' });
  at(t + 5600, { toast: null });
  move(t + 5800, 'reset');
  click(t + 6700);
  at(t + 6850, { pal: P3, brand: false, toast: 'Template colours restored' });
  move(t + 7900, 'apply');
  click(t + 8800);
  at(t + 8950, { pal: BRAND, brand: true, toast: 'Brand applied again' });
  at(t + 10400, { toast: null });
  // 5 — photo
  t = 31000;
  at(t, { step: 4, caption: 'Add your photo — drag it into the frame' });
  move(t + 400, 'rail-uploads');
  click(t + 1300);
  at(t + 1450, { panel: 'uploads' });
  move(t + 2300, 'photo0');
  at(t + 3100, { down: true, drag: true });
  move(t + 3300, 'frame');
  at(t + 4500, { down: false, drag: false, photo: true });
  // 6 — download
  t = 38000;
  at(t, { step: 5, caption: 'Download — a print-ready vector PDF in one click' });
  move(t + 400, 'download');
  click(t + 1400);
  at(t + 1550, { menu: 'formats' });
  move(t + 2300, 'fmt-pdf');
  click(t + 3200);
  at(t + 3350, { menu: 'pdf' });
  move(t + 4100, 'dl-pdf');
  click(t + 5000);
  for (let i = 1; i <= 20; i++) at(t + 5100 + i * 110, { progress: i * 5 });
  at(t + 7400, { saved: true });
  at(t + 9800, { menu: 'none', saved: false, progress: 0 });
  // 7 — resize
  t = 48500;
  at(t, { step: 6, caption: 'Resize it for an Instagram story' });
  move(t + 400, 'resize');
  click(t + 1400);
  at(t + 1550, { resize: true });
  move(t + 2300, 'story');
  click(t + 3200);
  at(t + 3350, { resize: false, story: true });
  at(t + 6500, { caption: 'Free, right in your browser. Start designing!' });
  move(t + 7000, 640, 640);
  at(t + 10200, { fade: true });
  const total = t + 11000;
  evs.sort((a, b) => a[0] - b[0]);
  return { evs, total };
}

export function HowToPlayer() {
  const { evs, total } = useMemo(buildTimeline, []);
  const [s, setS] = useState<S>(START);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(0.6);
  const barRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const clock = useRef({ t: 0, idx: 0, last: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    setScale(el.clientWidth / W);
    return () => ro.disconnect();
  }, []);

  // Pause while the player is off screen (saves battery) and when asked.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible || reduced) return;
    let raf = 0;
    clock.current.last = performance.now();
    const tick = (now: number) => {
      const c = clock.current;
      c.t += Math.min(100, now - c.last);
      c.last = now;
      if (c.t >= total) { c.t = 0; c.idx = 0; }
      const batch: Ev[] = [];
      while (c.idx < evs.length && evs[c.idx][0] <= c.t) batch.push(evs[c.idx++]);
      if (batch.length) setS((prev) => batch.reduce((acc, [, p]) => ({ ...acc, ...(typeof p === 'function' ? p(acc) : p) }), prev));
      if (barRef.current) barRef.current.style.width = `${(c.t / total) * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, reduced, evs, total]);

  // Point the cursor at the element it should click.
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!s.target) return;
    const raf = requestAnimationFrame(() => {
      const root = stageRef.current, el = root?.querySelector(`[data-t="${s.target}"]`) as HTMLElement | null;
      if (!root || !el) return;
      const a = root.getBoundingClientRect(), b = el.getBoundingClientRect(), k = a.width / W;
      setS((p) => ({ ...p, cx: (b.left + b.width / 2 - a.left) / k, cy: (b.top + b.height / 2 - a.top) / k, target: null }));
    });
    return () => cancelAnimationFrame(raf);
  }, [s.target, s.panel, s.menu, s.resize]);

  // Reduced motion: show the finished design, no movement.
  const view: S = reduced ? { ...START, loaded: true, title: "Aisha's 30th", pal: BRAND, brand: true, photo: true, step: 6, caption: 'Pick a template, edit, apply your brand, download' } : s;
  const jump = (i: number) => {
    const starts = [0, 4800, 12000, 19500, 31000, 38000, 48500];
    const target = starts[i];
    // Rebuild state by replaying every event up to the start of that step.
    let st = START;
    let idx = 0;
    while (idx < evs.length && evs[idx][0] <= target) { const p = evs[idx][1]; st = { ...st, ...(typeof p === 'function' ? p(st) : p) }; idx++; }
    clock.current = { t: target, idx, last: performance.now() };
    setS(st);
    setPlaying(true);
  };

  return (
    <div className="relative">
      <div ref={boxRef} className="relative w-full overflow-hidden" style={{ height: H * scale }} aria-label="How Magical Touch works: an animated walkthrough" role="img">
        <div ref={stageRef} className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <Stage s={view} />
        </div>
      </div>
      {/* steps + controls */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-t border-mt-border bg-mt-surface">
        <button onClick={() => setPlaying((p) => !p)} className="w-8 h-8 shrink-0 rounded-full bg-mt-primary text-mt-onprimary inline-flex items-center justify-center" aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
          {STEPS.map((label, i) => (
            <button key={label} onClick={() => jump(i)} className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-medium transition-colors ${i === view.step ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'}`}>
              <span className="tabular-nums mr-1 opacity-70">{i + 1}</span>{label}
            </button>
          ))}
        </div>
        <span className="hidden sm:block w-24 h-1 rounded-full bg-mt-border overflow-hidden" aria-hidden>
          <span ref={barRef} className="block h-full mt-spectrum" style={{ width: 0 }} />
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the editor replica

const RAIL = [
  { icon: LayoutTemplate, label: 'Templates', id: 'templates' },
  { icon: Shapes, label: 'Elements' },
  { icon: Type, label: 'Text' },
  { icon: ImageIcon, label: 'Photos' },
  { icon: Palette, label: 'Brand', id: 'brand' },
  { icon: Upload, label: 'Uploads', id: 'uploads' },
];
const THUMBS = ['summer-music-festival', 'balloon-bash-invitation', 'black-friday-deals', 'classic-wedding-invitation', 'neon-glow-birthday-party', 'classic-restaurant-menu'];

function Stage({ s }: { s: S }) {
  const posterW = s.story ? 236 : 300, posterH = 420;
  return (
    <div className="absolute inset-0 bg-mt-surface text-mt-ink select-none" style={{ opacity: s.fade ? 0 : 1, transition: 'opacity 0.6s' }}>
      {/* top bar */}
      <div className="absolute left-0 right-0 top-0 h-14 flex items-center gap-3 px-4 border-b border-mt-border">
        <span className="w-7 h-7 rounded-lg mt-spectrum" />
        <span className="text-[14px] font-semibold">{s.loaded ? `${s.title || ' '} — party poster` : 'Untitled design'}</span>
        <span className="flex items-center gap-2 ml-3 text-mt-faint"><Undo2 size={16} /><Redo2 size={16} /></span>
        <span className="ml-auto text-[12px] text-mt-faint tabular-nums">{s.story ? '1080 × 1920 px' : 'A4 · 210 × 297 mm'}</span>
        <span data-t="resize" className={`inline-flex items-center gap-1.5 text-[12px] font-medium border rounded-full px-3 py-1.5 ${s.resize ? 'border-[#3B82C4] text-[#3B82C4]' : 'border-mt-border text-mt-muted'}`} style={{ marginLeft: 8 }}><Maximize2 size={13} /> Resize</span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium border border-mt-border rounded-full px-3 py-1.5 text-mt-muted"><Eye size={13} /> Preview</span>
        <span data-t="download" className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-3.5 py-1.5 bg-mt-primary text-mt-onprimary"><Download size={13} /> Download</span>
      </div>

      {/* rail */}
      <div className="absolute left-0 top-14 bottom-0 w-[76px] border-r border-mt-border flex flex-col items-center gap-1 pt-3">
        {RAIL.map((r) => {
          const on = r.id === s.panel;
          return (
            <span key={r.label} data-t={r.id ? `rail-${r.id}` : undefined} className={`w-[60px] py-2 rounded-xl flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${on ? 'mt-active-blue border border-transparent text-mt-ink' : 'text-mt-faint'}`}>
              <r.icon size={18} />{r.label}
            </span>
          );
        })}
      </div>

      {/* side panel */}
      <div className="absolute left-[76px] top-14 bottom-0 w-[260px] border-r border-mt-border p-4">
        {s.panel === 'templates' && (
          <>
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-mt-border text-[12px] text-mt-faint"><Search size={14} /> Search 700+ templates</div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {THUMBS.map((t, i) => (
                <span key={t} data-t={`thumb${i}`} className={`relative h-[124px] rounded-lg overflow-hidden bg-mt-surface2 ${i === 0 && s.loaded ? 'ring-2 ring-[#3B82C4] ring-offset-2 ring-offset-mt-surface' : 'ring-1 ring-mt-border'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/templates/collection/${t}.jpg`} alt="" className="w-full h-full object-cover object-top" loading="lazy" />
                </span>
              ))}
            </div>
          </>
        )}
        {s.panel === 'brand' && (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-mt-faint">Brand kit</p>
            <div className="rounded-xl border border-mt-border p-3">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[13px] font-bold" style={{ background: '#2E1065', color: '#E8B04B', fontFamily: 'Georgia, serif' }}>AE</span>
                <span className="text-[13px] font-semibold">Aisha Events</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {['#2E1065', '#E8B04B', '#F9A8D4', '#FDF4FF'].map((c) => <span key={c} className="w-8 h-8 rounded-full ring-1 ring-black/10" style={{ background: c }} />)}
              </div>
              <p className="mt-2 text-[11px] text-mt-muted">Fonts: Georgia · Inter</p>
            </div>
            <span data-t="apply" className="h-10 rounded-xl bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center justify-center gap-2"><Sparkles size={14} /> Apply brand</span>
            <span data-t="reset" className="h-10 rounded-xl border border-mt-border text-[13px] font-medium inline-flex items-center justify-center gap-2"><RotateCcw size={14} /> Reset colours</span>
            <p className="text-[11px] text-mt-muted leading-snug">Reset puts back the template’s own colours. Your words and photos stay.</p>
          </div>
        )}
        {s.panel === 'uploads' && (
          <>
            <span className="h-10 rounded-xl border border-dashed border-mt-border text-[12px] text-mt-muted inline-flex w-full items-center justify-center gap-2"><Upload size={14} /> Upload photos</span>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} data-t={`photo${i}`} className={`h-[110px] rounded-lg overflow-hidden ring-1 ring-mt-border ${i === 0 && s.drag ? 'opacity-40' : ''}`}><Portrait variant={i} /></span>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-mt-muted leading-snug">Photos stay inside your design file — never shared.</p>
          </>
        )}
      </div>

      {/* canvas */}
      <div className="absolute left-[336px] right-[256px] top-14 bottom-0 bg-mt-studio overflow-hidden">
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(rgb(var(--mt-border)) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        {!s.loaded && <p className="absolute inset-0 flex items-center justify-center text-[13px] text-mt-faint">Pick a template to start</p>}
        <div
          className="absolute"
          style={{
            left: (608 - posterW) / 2, top: 92, width: posterW, height: posterH,
            transform: s.loaded ? 'scale(1)' : 'scale(0.6)', opacity: s.loaded ? 1 : 0,
            transition: 'transform 0.6s cubic-bezier(.2,.9,.3,1.2), opacity 0.4s, width 0.9s cubic-bezier(.6,0,.3,1), left 0.9s cubic-bezier(.6,0,.3,1)',
          }}
        >
          <Poster s={s} w={posterW} h={posterH} />
        </div>
        {/* caption */}
        <div className="absolute left-1/2 -translate-x-1/2 top-5 whitespace-nowrap">
          <span key={s.caption} className="inline-flex items-center gap-2 rounded-full bg-mt-ink text-mt-bg text-[15px] font-semibold px-5 py-2.5 shadow-lg mt-howto-cap">
            <span className="w-6 h-6 rounded-full mt-spectrum text-[12px] text-white inline-flex items-center justify-center tabular-nums">{s.step + 1}</span>
            {s.caption}
          </span>
        </div>
        {s.toast && (
          <span className="absolute left-1/2 -translate-x-1/2 bottom-6 inline-flex items-center gap-2 rounded-full bg-mt-surface border border-mt-border px-4 py-2 text-[13px] font-medium shadow-lg mt-howto-cap">
            <Check size={14} className="text-emerald-600" /> {s.toast}
          </span>
        )}
      </div>

      {/* properties */}
      <div className="absolute right-0 top-14 bottom-0 w-[256px] border-l border-mt-border p-4">
        <p className="text-[12px] font-semibold">Colour</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {[P0, P1, P2, P3].map((p, i) => (
            <span key={i} data-t={`sw${i}`} className={`w-7 h-7 rounded-full ring-offset-2 ring-offset-mt-surface transition-shadow ${s.pal.bg === p.bg ? 'ring-2 ring-mt-ink' : 'ring-1 ring-black/10'}`} style={{ background: p.bg }} />
          ))}
        </div>
        <div className="mt-4 h-2 rounded-full mt-spectrum relative"><span className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white ring-1 ring-black/15 shadow" style={{ left: `${({ [P0.bg]: 60, [P1.bg]: 6, [P2.bg]: 52, [P3.bg]: 80, [BRAND.bg]: 24 } as Record<string, number>)[s.pal.bg] ?? 40}%`, transition: 'left .5s' }} /></div>
        <p className="mt-6 text-[12px] font-semibold">Opacity</p>
        <div className="mt-3 flex items-center gap-3"><div className="flex-1 h-1.5 rounded-full bg-mt-border relative"><span className="absolute inset-y-0 left-0 w-full rounded-full bg-mt-ink" /></div><span className="text-[12px] tabular-nums text-mt-muted">100%</span></div>
        <p className="mt-6 text-[12px] font-semibold">Layers</p>
        <ul className="mt-2 space-y-1">
          {[{ i: Type, n: 'Title', on: s.sel === 'title' }, { i: AlignLeft, n: 'Details' }, { i: ImageIcon, n: s.photo ? 'Photo' : 'Photo frame' }, { i: Square, n: 'Background', lock: true }].map((l) => (
            <li key={l.n} className={`flex items-center gap-2 text-[12px] px-2.5 py-2 rounded-lg border ${l.on ? 'mt-active-blue' : 'border-transparent text-mt-muted'}`}>
              <l.i size={14} />{l.n}{l.lock && <Lock size={12} className="ml-auto text-mt-faint" />}
            </li>
          ))}
        </ul>
      </div>

      {/* download menu */}
      {s.menu !== 'none' && (
        <div className="absolute right-4 top-[58px] w-[250px] rounded-2xl border border-mt-border bg-mt-surface shadow-2xl p-2 mt-howto-pop">
          {s.menu === 'formats' ? (
            <>
              {[{ i: FileImage, n: 'PNG', d: 'Best for screens' }, { i: FileImage, n: 'JPG', d: 'Small file' }, { i: FileText, n: 'PDF — print', d: 'Vector, sharp at any size' }, { i: Link2, n: 'Share link', d: 'Anyone with the link' }].map((f, k) => (
                <div key={f.n} data-t={k === 2 ? 'fmt-pdf' : undefined} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${k === 2 ? 'bg-mt-surface2' : ''}`}>
                  <f.i size={16} className="text-mt-muted" />
                  <span><span className="block text-[13px] font-semibold">{f.n}</span><span className="block text-[11px] text-mt-muted">{f.d}</span></span>
                </div>
              ))}
            </>
          ) : (
            <div className="p-2 flex flex-col gap-2">
              <p className="text-[13px] font-semibold">PDF for print</p>
              {['Vector — text stays sharp', 'CMYK colours (FOGRA39)', '3 mm bleed + crop marks'].map((o) => (
                <span key={o} className="flex items-center gap-2 text-[12px]"><span className="w-4 h-4 rounded bg-[#3B82C4] text-white inline-flex items-center justify-center"><Check size={11} /></span>{o}</span>
              ))}
              <span data-t="dl-pdf" className="mt-1 h-10 rounded-xl bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center justify-center gap-2"><Download size={14} /> Download PDF</span>
              {s.progress > 0 && !s.saved && <span className="h-1.5 rounded-full bg-mt-border overflow-hidden"><span className="block h-full mt-spectrum" style={{ width: `${s.progress}%` }} /></span>}
              {s.saved && <span className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5"><Check size={14} /> aishas-30th.pdf saved · print-ready</span>}
            </div>
          )}
        </div>
      )}
      {s.resize && (
        <div className="absolute right-[150px] top-[58px] w-[220px] rounded-2xl border border-mt-border bg-mt-surface shadow-2xl p-2 mt-howto-pop">
          {['Instagram story · 1080×1920', 'Instagram post · 1080×1350', 'A5 flyer · 148×210 mm'].map((n, k) => (
            <div key={n} data-t={k === 0 ? 'story' : undefined} className={`px-3 py-2.5 rounded-xl text-[12.5px] font-medium ${k === 0 ? 'bg-mt-surface2' : ''}`}>{n}</div>
          ))}
        </div>
      )}

      {/* dragged photo */}
      {s.drag && (
        <span className="absolute w-[90px] h-[90px] rounded-lg overflow-hidden shadow-2xl ring-2 ring-white" style={{ left: s.cx - 45, top: s.cy - 45, transition: 'left 0.9s cubic-bezier(.45,0,.25,1), top 0.9s cubic-bezier(.45,0,.25,1)', opacity: 0.92 }}>
          <Portrait variant={0} />
        </span>
      )}

      {/* cursor */}
      <div className="absolute pointer-events-none" style={{ left: 0, top: 0, transform: `translate(${s.cx}px, ${s.cy}px)`, transition: 'transform 0.9s cubic-bezier(.45,0,.25,1)' }}>
        <span key={s.click} className="absolute -left-4 -top-4 w-8 h-8 rounded-full border-2 border-[#35C2F1] mt-howto-ripple" />
        <svg width="26" height="30" viewBox="0 0 26 30" style={{ transform: s.down ? 'scale(0.86)' : 'scale(1)', transformOrigin: '2px 2px', transition: 'transform .12s' }}>
          <path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12 17 L20 17 Z" fill="#0E0E12" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function Poster({ s, w, h }: { s: S; w: number; h: number }) {
  const p = s.pal;
  const T = 'background-color .7s, color .7s, border-color .7s, fill .7s';
  return (
    <div className="absolute inset-0 overflow-hidden shadow-[0_24px_50px_-20px_rgba(9,9,11,0.5)]" style={{ background: p.bg, transition: T, width: w, height: h }}>
      <span className="absolute rounded-full" style={{ width: 220, height: 220, right: -70, top: -60, background: p.sun, transition: T }} />
      <span className="absolute rounded-full" style={{ width: 90, height: 90, left: -30, bottom: 120, border: `10px solid ${p.sun}`, opacity: 0.6, transition: T }} />
      <div className="absolute left-6 right-6" style={{ top: 112 }}>
        <p className="text-[10px] font-bold tracking-[0.3em]" style={{ color: p.ink, opacity: 0.8, transition: T }}>YOU’RE INVITED</p>
        <div className="relative mt-2 inline-block">
          <p data-t="title" className="text-[34px] leading-[1.02] font-semibold" style={{ color: p.ink, fontFamily: p.font, transition: T, minHeight: 70, maxWidth: w - 48 }}>
            {s.title}
            {s.sel === 'title' && <span className="inline-block w-[2px] h-[30px] align-middle ml-0.5 mt-howto-caret" style={{ background: p.ink }} />}
          </p>
          {s.sel === 'title' && <span className="absolute -inset-1.5 border-[1.5px] border-[#35C2F1] rounded-sm" />}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: p.ink, opacity: 0.85, transition: T }}>Saturday 14 December · 8 PM<br />The Rooftop, Dubai Marina</p>
        <span className="mt-4 inline-block rounded-full px-3.5 py-1.5 text-[10px] font-bold tracking-wider" style={{ background: p.pill, color: p.pillInk, transition: T }}>RSVP 050 123 4567</span>
      </div>
      {/* photo frame */}
      <span data-t="frame" className="absolute rounded-full overflow-hidden" style={{ width: 118, height: 118, right: 18, bottom: 22, border: s.photo ? `4px solid ${p.sun}` : `2px dashed ${p.ink}`, transition: T, opacity: s.photo ? 1 : 0.55 }}>
        {s.photo ? <span className="block w-full h-full mt-howto-pop"><Portrait variant={0} /></span> : <span className="w-full h-full flex items-center justify-center text-[10px] font-semibold" style={{ color: p.ink }}>Drop photo</span>}
      </span>
      {s.brand && (
        <span className="absolute left-5 bottom-6 inline-flex items-center gap-1.5 mt-howto-pop">
          <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[10px] font-bold" style={{ background: '#E8B04B', color: '#2E1065', fontFamily: 'Georgia, serif' }}>AE</span>
          <span className="text-[10px] font-semibold" style={{ color: p.ink }}>Aisha Events</span>
        </span>
      )}
    </div>
  );
}

// Illustrated "photos" (no stock images): a person on a soft gradient.
function Portrait({ variant }: { variant: number }) {
  const bgs = [['#FDE68A', '#F9A8D4'], ['#BAE6FD', '#A7F3D0'], ['#DDD6FE', '#FBCFE8'], ['#FED7AA', '#FECACA']];
  const [a, b] = bgs[variant % 4];
  const skin = ['#C68B67', '#8D5A3B', '#E8B48F', '#B07650'][variant % 4];
  const hair = ['#2B1D16', '#111', '#6B3F1D', '#3A2418'][variant % 4];
  const top = ['#7C3AED', '#0EA5E9', '#F43F5E', '#10B981'][variant % 4];
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id={`pg${variant}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="100" height="100" fill={`url(#pg${variant})`} />
      <path d="M18 100 C 20 76 34 68 50 68 C 66 68 80 76 82 100 Z" fill={top} />
      <rect x="44" y="56" width="12" height="14" rx="5" fill={skin} />
      <ellipse cx="50" cy="44" rx="16" ry="19" fill={skin} />
      <path d="M33 44 C 31 24 44 18 52 20 C 64 20 70 30 67 46 C 64 36 58 31 50 31 C 42 31 36 36 33 44 Z" fill={hair} />
      <circle cx="44" cy="45" r="1.6" fill="#1E1E24" /><circle cx="56" cy="45" r="1.6" fill="#1E1E24" />
      <path d="M45 53 Q 50 57 55 53" stroke="#1E1E24" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
