'use client';

import { useTemplateCountLabel } from '@/lib/templateCount';
// The home page tutorial: a crisp, self-playing replica of the real editor
// layout (top bar, left rail, floating toolbar, pages bar), built with
// HTML/CSS so it is sharp at any size and weighs almost nothing. In about 80
// seconds a cursor picks a business-summit template, edits the speaker's
// name, adds glow and echo, swaps the photo, removes its background (a real
// cut-out made with the site's own model), applies a brand kit (the whole
// poster restyles), switches to Pro and opens Mockups (real renders of this
// poster from lib/mockups.ts), translates to Arabic and back, resizes into a
// story and downloads a vector PDF. On phones a camera follows the cursor.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, Undo2, Redo2, Wand2, FileText, Download, LayoutTemplate, Shapes, Type, Upload, Brush, PaintBucket, Palette,
  Layers, Files, HelpCircle, Bold, Italic, Underline, Strikethrough, AlignCenter, CaseSensitive, Spline, Newspaper, Sparkles, Languages, Minus, Plus,
  Droplet, Lock, Copy, Trash2, Replace, Crop, SlidersHorizontal, Scissors, Search, X, Check, Image as ImageIcon, FileImage, Printer, Loader2, Pause, Play, Maximize, Sun,
} from 'lucide-react';

const W = 1440, H = 900;
const PH = (n: number) => `/templates/photos/mt-${n}.jpg`;

type Dlg = 'none' | 'translate' | 'resize' | 'export' | 'mockups';
type Brand = 'nw' | 'au';
interface S {
  step: number;
  cx: number; cy: number; click: number; down: boolean; target: string | null;
  panel: boolean; loaded: boolean;
  sel: 'name' | 'headline' | 'photo' | null; editing: boolean;
  name: string; fx: 'none' | 'glow' | 'echo'; fxOpen: boolean;
  photo: number; swapping: boolean; cut: boolean;
  brand: Brand; brandPanel: boolean; brandPick: boolean;
  pro: boolean; menu: boolean; mk: number;
  lang: 'en' | 'ar';
  dlg: Dlg; search: string; langPick: boolean; scopeAll: boolean; busy: boolean; done: boolean;
  storyPick: boolean; story: boolean;
  pdfPick: boolean; preparing: boolean; toast: string | null;
  fade: boolean;
}
const START: S = {
  step: 0, cx: 900, cy: 520, click: 0, down: false, target: null, panel: true, loaded: false, sel: null, editing: false,
  name: 'DANIEL OKAFOR', fx: 'none', fxOpen: false, photo: 813, swapping: false, cut: false,
  brand: 'nw', brandPanel: false, brandPick: false, pro: false, menu: false, mk: 0, lang: 'en',
  dlg: 'none', search: '', langPick: false, scopeAll: false, busy: false, done: false, storyPick: false, story: false,
  pdfPick: false, preparing: false, toast: null, fade: false,
};
type Ev = [number, Partial<S> | ((s: S) => Partial<S>)];

// Step titles; each step's start time is filled in by buildTimeline().
const STEPS: { at: number; title: string; sub: string }[] = [
  { at: 0, title: 'Pick a template', sub: '{count} designs, ready in a tap' },
  { at: 0, title: 'Make the words yours', sub: 'Click any text and type' },
  { at: 0, title: 'Add a little magic', sub: 'Glow, echo, neon — one click' },
  { at: 0, title: 'Swap in your photo', sub: 'It fits the frame perfectly' },
  { at: 0, title: 'Remove the background', sub: 'One click — done in your browser' },
  { at: 0, title: 'Apply your brand kit', sub: 'Your logo, colours and fonts, everywhere' },
  { at: 0, title: 'See it in real life', sub: 'Pro menus → Mockups: wall, phone, tote…' },
  { at: 0, title: 'Translate in one click', sub: 'Arabic, French, Hindi… right fonts too' },
  { at: 0, title: 'Resize for anywhere', sub: 'Post to story — nothing stretched' },
  { at: 0, title: 'Download print-ready', sub: 'Vector PDF, sharp at any size' },
];
// Real mockups of this poster, rendered by the site's own mockup engine.
const MOCKS: [string, string][] = [['frame-wall', 'Framed on a wall'], ['phone', 'Phone'], ['poster-tape', 'Poster'], ['tote', 'Tote bag'], ['room-living', 'Living room'], ['instagram', 'Instagram']];

function buildTimeline() {
  const evs: Ev[] = [];
  const at = (ms: number, p: Ev[1]) => evs.push([ms, p]);
  const move = (ms: number, id: string) => at(ms, { target: id });
  const click = (ms: number) => { at(ms, { down: true }); at(ms + 150, (s) => ({ down: false, click: s.click + 1 })); };
  const type = (ms: number, text: string, every: number, key: 'name' | 'search') => { for (let i = 1; i <= text.length; i++) at(ms + i * every, { [key]: text.slice(0, i) } as Partial<S>); };
  const step = (i: number, ms: number) => { STEPS[i].at = ms; at(ms, { step: i }); };

  at(0, { ...START });
  // 0 · template
  step(0, 0); move(500, 'thumb0'); click(1700); at(1850, { loaded: true }); at(2500, { panel: false });
  // 1 · words
  step(1, 4000); move(4300, 'name'); click(5100); at(5250, { sel: 'name' });
  click(5700); click(5900); at(6100, { editing: true });
  at(6800, { name: '' }); type(6800, 'LAYLA MANSOUR', 150, 'name');
  move(9100, 'empty'); click(9800); at(9950, { sel: null, editing: false });
  // 2 · effects
  step(2, 10500); move(10800, 'headline'); click(11600); at(11750, { sel: 'headline' });
  move(12300, 'tb-effects'); click(13000); at(13150, { fxOpen: true });
  move(13700, 'fx-glow'); click(14400); at(14550, { fx: 'glow' });
  move(15300, 'fx-echo'); click(16000); at(16150, { fx: 'echo' });
  move(16900, 'empty'); click(17600); at(17750, { fxOpen: false, sel: null });
  // 3 · photo
  step(3, 18300); move(18600, 'photo'); click(19300); at(19450, { sel: 'photo' });
  move(20000, 'tb-replace'); click(20700); at(20850, { swapping: true }); at(21500, { photo: 589 }); at(22300, { swapping: false });
  // 4 · remove background (photo still selected)
  step(4, 23300); move(23500, 'tb-removebg'); click(24300); at(24450, { swapping: true }); at(25700, { cut: true, swapping: false, toast: 'Background removed' }); at(27100, { toast: null });
  move(27300, 'empty'); click(27900); at(28050, { sel: null });
  // 5 · brand kit
  step(5, 28500); move(28800, 'rail-brand'); click(29500); at(29650, { brandPanel: true });
  move(30300, 'kit-au'); click(31000); at(31150, { brandPick: true });
  move(31700, 'brand-apply'); click(32400); at(32550, { brand: 'au', toast: 'Aurum Capital applied · colours, fonts and logo' });
  at(34200, { brandPanel: false, toast: null });
  // 6 · Pro menus → mockups
  step(6, 34700); move(35000, 'top-pro'); click(35700); at(35850, { pro: true });
  move(36400, 'menu-file'); click(37000); at(37150, { menu: true });
  move(37700, 'menu-mockups'); click(38400); at(38550, { menu: false, dlg: 'mockups', mk: 0 });
  MOCKS.slice(1, 4).forEach((_, i) => { const t0 = 39800 + i * 1500; move(t0, `mk-${i + 1}`); click(t0 + 700); at(t0 + 850, { mk: i + 1 }); });
  move(44400, 'mk-close'); click(45100); at(45250, { dlg: 'none', pro: false });
  // 7 · translate
  step(7, 45800); move(46100, 'headline'); click(46800); at(46950, { sel: 'headline' });
  move(47500, 'tb-translate'); click(48200); at(48350, { dlg: 'translate' });
  move(49000, 'tr-search'); click(49600); type(49700, 'Arab', 160, 'search');
  move(50700, 'tr-arabic'); click(51400); at(51550, { langPick: true });
  move(52100, 'tr-all'); click(52800); at(52950, { scopeAll: true });
  move(53400, 'tr-go'); click(54100); at(54250, { busy: true }); at(55200, { busy: false, done: true, lang: 'ar' });
  move(56000, 'tr-close'); click(56800); at(56950, { dlg: 'none', sel: null, search: '', langPick: false, scopeAll: false, done: false });
  move(57800, 'undo'); click(58700); at(58850, { lang: 'en', toast: 'Undo · back to English' }); at(59900, { toast: null });
  // 8 · resize
  step(8, 60100); move(60400, 'top-resize'); click(61200); at(61350, { dlg: 'resize' });
  move(62000, 'rs-story'); click(62700); at(62850, { storyPick: true });
  move(63400, 'rs-go'); click(64100); at(64250, { dlg: 'none', story: true, storyPick: false });
  // 9 · download
  step(9, 67300); move(67600, 'top-export'); click(68400); at(68550, { dlg: 'export' });
  move(69200, 'ex-pdf'); click(69900); at(70050, { pdfPick: true });
  move(70600, 'ex-go'); click(71300); at(71450, { preparing: true });
  at(72900, { preparing: false, dlg: 'none', pdfPick: false, toast: 'Growth Summit 2027.pdf saved · vector, print-ready' });
  move(73500, 'empty'); at(76800, { toast: null }); at(78800, { fade: true });
  const total = 79700;
  evs.sort((a, b) => a[0] - b[0]);
  return { evs, total };
}

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export function HowToPlayer() {
  const count = useTemplateCountLabel();
  const { evs, total } = useMemo(buildTimeline, []);
  const [s, setS] = useState<S>(START);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(0.6);
  // Phones: instead of shrinking the whole 1440-px editor to an unreadable
  // stamp, a camera follows the cursor over a smaller window of it.
  const [boxW, setBoxW] = useState(W * 0.6);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const clock = useRef({ t: 0, idx: 0, last: 0 });
  const chipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => { setBoxW(el.clientWidth); setScale(el.clientWidth / W); };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
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
      if (barRef.current) barRef.current.style.transform = `scaleX(${c.t / total})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, reduced, evs, total]);

  // Point the cursor at the element it should click (measured live).
  useEffect(() => {
    if (!s.target) return;
    const raf = requestAnimationFrame(() => {
      const root = stageRef.current, el = root?.querySelector(`[data-t="${s.target}"]`) as HTMLElement | null;
      if (!root || !el) return setS((p) => ({ ...p, target: null }));
      const a = root.getBoundingClientRect(), b = el.getBoundingClientRect(), k = a.width / W;
      setS((p) => ({ ...p, cx: (b.left + b.width / 2 - a.left) / k, cy: (b.top + b.height / 2 - a.top) / k, target: null }));
    });
    return () => cancelAnimationFrame(raf);
  }, [s.target, s.dlg, s.sel, s.fxOpen, s.panel, s.search]);

  // Keep the current step's chip in view on narrow screens.
  useEffect(() => {
    const bar = chipsRef.current, chip = bar?.querySelector('[aria-current="true"]') as HTMLElement | null;
    if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [s.step]);

  const jump = (i: number) => {
    const target = STEPS[i].at;
    let st = START, idx = 0;
    while (idx < evs.length && evs[idx][0] <= target) { const p = evs[idx][1]; st = { ...st, ...(typeof p === 'function' ? p(st) : p) }; idx++; }
    clock.current = { t: target, idx, last: performance.now() };
    setS(st);
    setPlaying(true);
  };
  const view: S = reduced ? { ...START, panel: false, loaded: true, name: 'LAYLA MANSOUR', fx: 'glow', photo: 589, cut: true, brand: 'au', step: 0 } : s;
  const step = STEPS[view.step];
  const cam = boxW < 640;
  const CW = 640, CH = 720;
  const k = cam ? boxW / CW : scale;
  // Dialogs sit in the middle of the editor: frame them whole.
  const focusX = view.dlg !== 'none' ? (W + 76) / 2 : view.cx;
  const focusY = view.dlg !== 'none' ? H / 2 : view.cy;
  const camL = cam ? Math.max(0, Math.min(W - CW, focusX - CW / 2)) : 0;
  const camT = cam ? Math.max(0, Math.min(H - CH, focusY - CH / 2)) : 0;
  const caption = (
    <div key={view.step} className={cam ? 'px-3 pt-3' : 'mt-howto-caption relative rounded-[22px] bg-black/80 text-white px-7 py-5 shadow-2xl ring-1 ring-white/10 w-[360px]'}>
      {!cam && <span className="mt-howto-spark" aria-hidden><Sparkles size={26} /></span>}
      <p className={cam ? 'text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3B82C4]' : 'text-[13px] font-semibold uppercase tracking-[0.2em] text-[#8FE3FF]'}>Step {view.step + 1} of {STEPS.length}</p>
      <p className={cam ? 'text-[18px] font-semibold leading-tight mt-0.5 text-mt-ink' : 'text-[27px] font-semibold leading-tight mt-0.5'}>{step.title}</p>
      <p className={cam ? 'text-[14px] text-mt-muted' : 'text-[17px] text-white/75'}>{step.sub.replace('{count}', count)}</p>
    </div>
  );

  return (
    <div className="relative select-none">
      <FontFaces />
      <div ref={boxRef} className="relative w-full overflow-hidden" style={{ height: (cam ? CH : H) * k }} role="img" aria-label="How Magical Touch works: an animated walkthrough of the editor">
        <div ref={stageRef} className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${k}) translate(${-camL}px, ${-camT}px)`, transition: cam ? 'transform .9s cubic-bezier(.45,0,.25,1)' : undefined }}>
          <Stage s={view} />
          {/* caption (desktop: floating card on the stage) */}
          {!cam && (
            <div className="absolute right-[44px] top-[330px] pointer-events-none z-40" style={{ opacity: view.fade ? 0 : 1, transition: 'opacity .5s' }}>
              {caption}
            </div>
          )}
        </div>
      </div>
      {/* phones: the caption sits under the screen, full size */}
      {cam && <div className="border-t border-mt-border bg-mt-surface pb-1">{caption}</div>}
      <div ref={chipsRef} className="relative flex items-center gap-1.5 px-2 sm:px-3 py-2 border-t border-mt-border bg-mt-surface overflow-x-auto no-scrollbar">
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'} className="shrink-0 w-8 h-8 rounded-full grid place-items-center bg-mt-primary text-mt-onprimary">
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        {STEPS.map((st, i) => (
          <button key={st.title} onClick={() => jump(i)} aria-current={i === view.step} className={cx('shrink-0 h-8 px-3 rounded-full text-[12px] font-medium transition-colors', i === view.step ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink hover:bg-mt-surface2')}>
            <span className="tabular-nums mr-1 opacity-70">{i + 1}</span>{st.title}
          </button>
        ))}
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-mt-border" aria-hidden>
          <div ref={barRef} className="h-full origin-left mt-spectrum" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </div>
  );
}

// The design's fonts, through the site's own font proxy.
function FontFaces() {
  const f = (fam: string, w: number) => `@font-face{font-family:'${fam}';font-weight:${w};src:url('/api/font-file?family=${encodeURIComponent(fam)}&weight=${w}') format('truetype');font-display:swap}`;
  return <style dangerouslySetInnerHTML={{ __html: [f('Sora', 400), f('Sora', 600), f('Sora', 800), f('Inter', 400), f('Inter', 600), f('Cairo', 400), f('Cairo', 700), f('Playfair Display', 700), f('Playfair Display', 800)].join('') }} />;
}

// ---------------------------------------------------------------- editor replica

const RAIL = [
  { i: LayoutTemplate, l: 'Templates' }, { i: Shapes, l: 'Elements' }, { i: Type, l: 'Text' }, { i: Upload, l: 'Upload' }, { i: Brush, l: 'Draw' },
  { i: PaintBucket, l: 'Background' }, { i: Palette, l: 'Brand' }, { i: Layers, l: 'Layers' }, { i: Files, l: 'Pages' }, { i: HelpCircle, l: 'Help' },
];
const THUMBS = ['', 'annual-conference-poster', 'business-seminar-speakers-flyer', 'gradient-mesh-tech-meetup-flyer', 'geometric-we-are-hiring-post', 'navy-professional-photo-resume'];
const LOOKS = ['None', 'Shadow', 'Lift', 'Glow', 'Neon', 'Echo', 'Hollow', 'Retro', 'Pop', 'Dreamy'];
const LANGS = [['English', 'English'], ['Arabic', 'العربية'], ['Hindi', 'हिन्दी'], ['Malayalam', 'മലയാളം'], ['Tamil', 'தமிழ்'], ['Telugu', 'తెలుగు'], ['French', 'Français'], ['Spanish', 'Español'], ['German', 'Deutsch']];

function Btn({ children, t, className = '' }: { children: ReactNode; t?: string; className?: string }) {
  return <span data-t={t} className={cx('inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[15px] font-medium', className)}>{children}</span>;
}

function Stage({ s }: { s: S }) {
  const story = s.story;
  const k = story ? 0.3375 : 0.48;
  const pw = 1080 * k, ph = (story ? 1920 : 1350) * k;
  const left = (76 + W) / 2 - pw / 2, top = 120;
  return (
    <div className="absolute inset-0 bg-mt-surface text-mt-ink" style={{ opacity: s.fade ? 0 : 1, transition: 'opacity .7s' }}>
      {/* top bar */}
      <div className="absolute left-0 right-0 top-0 h-14 flex items-center gap-2 px-3 border-b border-mt-border bg-mt-surface">
        <ChevronLeft size={20} className="text-mt-muted mx-1" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-[20px] w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="" className="h-[20px] w-auto hidden dark:block" />
        <span className="ml-2 h-9 w-[208px] rounded-lg border border-mt-input-border px-2.5 flex items-center text-[15px]">{s.loaded ? (s.lang === 'ar' ? 'قمة النمو ٢٠٢٧' : 'Growth Summit 2027') : 'Untitled Design'}</span>
        <span className="ml-3 text-[13px] text-mt-faint">{s.loaded ? 'Saved' : 'Not saved yet'}</span>
        <span className="ml-auto flex items-center gap-2 text-mt-muted">
          <span data-t="undo" className={cx('w-9 h-9 grid place-items-center rounded-lg', s.loaded ? 'text-mt-ink' : 'opacity-40')}><Undo2 size={18} /></span>
          <span className="w-9 h-9 grid place-items-center rounded-lg opacity-40"><Redo2 size={18} /></span>
          <span className="ml-2 inline-flex rounded-full border border-mt-border p-0.5 text-[13px]"><span className={cx('px-3 py-1 rounded-full', !s.pro && 'bg-mt-surface2 text-mt-ink')}>Simple</span><span data-t="top-pro" className={cx('px-3 py-1 rounded-full', s.pro && 'bg-mt-primary text-mt-onprimary')}>Pro</span></span>
        </span>
        <Btn t="top-resize" className={cx('text-mt-ink', s.dlg === 'resize' && 'bg-mt-surface2')}><Wand2 size={17} className="text-[#3B82C4]" />Resize</Btn>
        <span className="w-11 h-6 rounded-full bg-mt-surface2 border border-mt-border relative mx-1"><span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow grid place-items-center"><Sun size={11} className="text-amber-500" /></span></span>
        <Btn className="border border-mt-border"><FileText size={16} />PDF</Btn>
        <Btn t="top-export" className={cx('border border-mt-border', s.dlg === 'export' && 'bg-mt-surface2')}><Download size={16} />Export</Btn>
        <span className="inline-flex h-10 rounded-xl bg-mt-primary text-mt-onprimary text-[15px] font-semibold overflow-hidden"><span className="px-4 grid place-items-center">Save</span><span className="w-8 grid place-items-center border-l border-white/20"><ChevronDown size={15} /></span></span>
        <span className="w-9 h-9 rounded-full bg-mt-primary text-mt-onprimary grid place-items-center text-[15px] font-semibold ml-1">M</span>
      </div>

      {/* rail */}
      <div className="absolute z-20 left-0 top-14 bottom-[74px] w-[76px] border-r border-mt-border bg-mt-surface flex flex-col items-center gap-1 pt-3">
        {RAIL.map((r, i) => (
          <span key={r.l} data-t={i === 6 ? 'rail-brand' : undefined} className={cx('w-[66px] py-2 rounded-xl flex flex-col items-center gap-1 text-[11px]', (i === 0 && s.panel) || (i === 6 && s.brandPanel) ? 'bg-mt-surface2 text-mt-ink' : i === 6 ? 'text-[#3B82C4]' : 'text-mt-muted')}>
            <r.i size={20} />{r.l}
          </span>
        ))}
      </div>

      {/* canvas area */}
      <div data-t="empty-zone" className="absolute left-[76px] right-0 top-14 bottom-[74px] bg-mt-studio overflow-hidden">
        <span data-t="empty" className="absolute right-[220px] top-[540px] w-2 h-2" />
      </div>
      <div className="absolute" style={{ left, top, width: pw, height: ph, transition: 'all .9s cubic-bezier(.6,0,.3,1)', opacity: s.loaded ? 1 : 0, transform: s.loaded ? 'scale(1)' : 'scale(.92)' }}>
        <Design s={s} k={k} />
      </div>

      {/* floating toolbar */}
      {s.loaded && !s.panel && <Toolbar s={s} />}

      {/* templates panel */}
      <div className="absolute z-10 top-14 bottom-[74px] w-[330px] bg-mt-surface border-r border-mt-border p-4 shadow-xl" style={{ left: 76, transform: s.panel ? 'translateX(0)' : 'translateX(-125%)', opacity: s.panel ? 1 : 0, transition: 'transform .5s cubic-bezier(.6,0,.3,1), opacity .5s' }}>
        <p className="text-[17px] font-semibold">Templates</p>
        <div className="mt-3 h-10 rounded-xl border border-mt-input-border flex items-center gap-2 px-3 text-[14px] text-mt-faint"><Search size={16} />Search business</div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {THUMBS.map((t, i) => (
            <span key={t} data-t={`thumb${i}`} className={cx('relative h-[170px] rounded-xl overflow-hidden bg-mt-surface2', i === 0 && s.loaded ? 'ring-2 ring-[#3B82C4]' : 'ring-1 ring-mt-border')}>
              {t ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/templates/collection/${t}.jpg`} alt="" className="w-full h-full object-cover object-top" loading="lazy" />
              ) : (
                <span className="absolute left-0 top-0" style={{ width: 1080 * 0.126, height: 1350 * 0.126 }}><Design s={{ ...START, loaded: true }} k={0.126} /></span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* brand kit panel */}
      <div className="absolute z-10 top-14 bottom-[74px] w-[330px] bg-mt-surface border-r border-mt-border p-4 shadow-xl" style={{ left: 76, transform: s.brandPanel ? 'translateX(0)' : 'translateX(-125%)', opacity: s.brandPanel ? 1 : 0, transition: 'transform .5s cubic-bezier(.6,0,.3,1), opacity .5s' }}>
        <p className="text-[17px] font-semibold">Brand kit</p>
        <p className="mt-1 text-[13px] text-mt-muted">Logo, colours and fonts — applied in one click.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {(['nw', 'au'] as Brand[]).map((b) => {
            const k = KITS[b], on = (b === 'au' && s.brandPick) || (b === 'nw' && !s.brandPick);
            return (
              <span key={b} data-t={`kit-${b}`} className={cx('rounded-2xl border p-3 flex items-center gap-3', on ? 'border-[#3B82C4] ring-1 ring-[#3B82C4] bg-mt-surface2' : 'border-mt-border')}>
                <span className="w-11 h-11 rounded-xl grid place-items-center text-[18px] font-bold" style={{ background: k.dark, color: k.solid, fontFamily: k.head }}>{k.mark}</span>
                <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold" style={{ fontFamily: k.head }}>{k.name}</span><span className="flex gap-1 mt-1">{k.swatches.map((c) => <span key={c} className="w-4 h-4 rounded-full border border-black/10" style={{ background: c }} />)}</span></span>
              </span>
            );
          })}
        </div>
        <p className="mt-5 text-[13px] text-mt-muted">Fonts</p>
        <p className="text-[16px] font-semibold" style={{ fontFamily: s.brandPick ? KITS.au.head : KITS.nw.head }}>{s.brandPick ? 'Playfair Display' : 'Sora'} <span className="text-[13px] font-normal text-mt-muted" style={{ fontFamily: 'Inter, sans-serif' }}>· Inter</span></p>
        <span data-t="brand-apply" className="mt-5 h-11 rounded-xl bg-mt-primary text-mt-onprimary text-[15px] font-semibold grid place-items-center">Apply to design</span>
      </div>

      {/* Pro: menu bar */}
      {s.pro && (
        <div className="absolute z-30 left-0 right-0 top-14 h-9 flex items-center gap-0.5 px-2 border-b border-mt-border bg-mt-surface text-[14px] mt-howto-pop">
          {['File', 'Edit', 'Object', 'Type', 'Select', 'View', 'Window', 'Help'].map((m) => <span key={m} data-t={m === 'File' ? 'menu-file' : undefined} className={cx('px-3 h-8 grid place-items-center rounded', m === 'File' && s.menu && 'bg-mt-surface2')}>{m}</span>)}
          {s.menu && (
            <div className="absolute left-2 top-9 w-[300px] rounded-lg border border-mt-border bg-mt-surface shadow-2xl py-1.5 mt-howto-pop">
              {[['New Design', ''], ['Open…', ''], ['Save', '⌘S'], ['Version History…', ''], ['Export…', ''], ['Mockups…', ''], ['Preflight…', ''], ['Document & Print Setup', '']].map(([l, k]) => (
                <span key={l} data-t={l === 'Mockups…' ? 'menu-mockups' : undefined} className={cx('mx-1.5 px-3 h-9 rounded flex items-center justify-between', l === 'Mockups…' && 'bg-[#2F6FE4] text-white font-medium')}>{l}{k && <span className="text-[12px] text-mt-faint">{k}</span>}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* pages bar */}
      <div className="absolute left-0 right-0 bottom-0 h-[74px] border-t border-mt-border bg-mt-surface flex items-center px-3 gap-3">
        <span className="w-[44px] h-[56px] rounded-md ring-2 ring-[#3B82C4] overflow-hidden bg-[#0B1630]">
          {s.loaded && <span className="relative block w-full h-full"><Design s={{ ...s, sel: null, editing: false }} k={story ? 44 / 1080 : 44 / 1080} /></span>}
        </span>
        <span className="w-[44px] h-[56px] rounded-md border-2 border-dashed border-mt-border grid place-items-center text-mt-faint"><Plus size={18} /></span>
        <span className="ml-auto inline-flex items-center gap-3 h-11 px-3 rounded-xl border border-mt-border text-[13px] text-mt-muted">Page 1 <ChevronLeft size={15} /><Copy size={15} /><Trash2 size={15} /><ChevronRight size={15} /></span>
        <span className="inline-flex items-center gap-2 text-mt-muted ml-4"><Minus size={16} /><span className="w-28 h-1.5 rounded-full bg-mt-border relative"><span className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-[#3B82C4]" /><span className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#3B82C4] ring-2 ring-white" /></span><Plus size={16} /><span className="text-[13px] tabular-nums w-10 text-right">{story ? '34%' : '48%'}</span><Maximize size={15} /><HelpCircle size={16} /></span>
      </div>

      {/* dialogs */}
      {s.dlg !== 'none' && <div className="absolute inset-0 z-30 bg-black/40" />}
      {s.dlg === 'translate' && <TranslateDlg s={s} />}
      {s.dlg === 'resize' && <ResizeDlg s={s} />}
      {s.dlg === 'export' && <ExportDlg s={s} />}
      {s.dlg === 'mockups' && <MockupsDlg s={s} />}
      {s.toast && (
        <span className="absolute z-30 left-1/2 -translate-x-1/2 top-[76px] inline-flex items-center gap-2 rounded-full bg-mt-surface border border-mt-border px-5 py-2.5 text-[15px] font-medium shadow-xl mt-howto-pop">
          <Check size={16} className="text-emerald-600" /> {s.toast}
        </span>
      )}

      {/* cursor */}
      <div className="absolute pointer-events-none z-50" style={{ left: 0, top: 0, transform: `translate(${s.cx}px, ${s.cy}px)`, transition: 'transform .75s cubic-bezier(.45,0,.25,1)' }}>
        <span key={s.click} className="absolute -left-5 -top-5 w-10 h-10 rounded-full border-[3px] border-[#35C2F1] mt-howto-ripple" />
        <svg width="30" height="34" viewBox="0 0 26 30" style={{ transform: s.down ? 'scale(.86)' : 'scale(1)', transformOrigin: '2px 2px', transition: 'transform .12s', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' }}>
          <path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12 17 L20 17 Z" fill="#0E0E12" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function Toolbar({ s }: { s: S }) {
  const text = s.sel === 'name' || s.sel === 'headline';
  const bar = 'absolute left-1/2 -translate-x-1/2 top-[70px] h-[52px] rounded-2xl bg-mt-surface border border-mt-border shadow-lg flex items-center gap-1 px-2 text-mt-ink whitespace-nowrap mt-howto-pop';
  if (text) {
    const font = s.lang === 'ar' && s.sel === 'headline' ? 'Cairo' : 'Sora';
    const size = s.sel === 'name' ? 30 : 124;
    return (
      <div key="text" className={bar}>
        <span className="h-9 w-[150px] rounded-lg border border-mt-input-border px-2 flex items-center justify-between text-[13px]" style={{ fontFamily: font }}>{font}<ChevronDown size={13} /></span>
        <span className="h-9 w-[96px] rounded-lg border border-mt-input-border px-2 flex items-center justify-between text-[13px]">Regular<ChevronDown size={13} /></span>
        <Minus size={15} className="mx-1 text-mt-muted" /><span className="h-9 w-12 rounded-lg border border-mt-input-border grid place-items-center text-[14px] tabular-nums">{size}</span><Plus size={15} className="mx-1 text-mt-muted" />
        <span className="w-6 h-6 rounded-full mx-1" style={{ background: '#FFFFFF', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }} />
        {[Bold, Italic, Underline, Strikethrough, AlignCenter, CaseSensitive, Spline].map((I, i) => <span key={i} className="w-9 h-9 grid place-items-center"><I size={17} /></span>)}
        <span className="inline-flex items-center gap-1.5 h-9 px-2.5 text-[14px]"><Newspaper size={16} />Text frame</span>
        <span data-t="tb-effects" className={cx('inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[14px] ring-1', s.fxOpen ? 'ring-[#3B82C4] bg-mt-surface2' : 'ring-[#F2708F]/50')}><Sparkles size={16} />Effects</span>
        <span data-t="tb-translate" className="inline-flex items-center gap-1.5 h-9 px-2.5 text-[14px]"><Languages size={16} />Translate</span>
        <span className="w-px h-6 bg-mt-border mx-1" />
        <span className="inline-flex items-center gap-1.5 h-9 px-2.5 text-[14px]"><Layers size={16} />Position</span>
        {[Droplet, Lock, Copy, Trash2].map((I, i) => <span key={i} className="w-9 h-9 grid place-items-center text-mt-muted"><I size={16} /></span>)}
        {s.fxOpen && <FxPopover s={s} />}
      </div>
    );
  }
  if (s.sel === 'photo') {
    return (
      <div key="photo" className={bar}>
        <span data-t="tb-replace" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[14px] bg-mt-surface2"><Replace size={16} />Replace</span>
        {[[Crop, 'Crop'], [SlidersHorizontal, 'Adjust'], [Scissors, 'Remove BG'], [Wand2, 'Edit photo']].map(([I, l]: any) => <span key={l} data-t={l === 'Remove BG' ? 'tb-removebg' : undefined} className={cx('inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[14px]', l === 'Remove BG' && s.photo === 589 && 'ring-1 ring-[#F2708F]/60', l === 'Remove BG' && s.cut && 'bg-mt-surface2')}><I size={16} />{l}</span>)}
        <span className="w-px h-6 bg-mt-border mx-1" />
        <span className="inline-flex items-center gap-1.5 h-9 px-3 text-[14px]"><Layers size={16} />Position</span>
        {[Droplet, Lock, Copy, Trash2].map((I, i) => <span key={i} className="w-9 h-9 grid place-items-center text-mt-muted"><I size={16} /></span>)}
      </div>
    );
  }
  return (
    <div key="page" className={bar}>
      <span className="px-3 text-[14px] text-mt-muted">Page</span>
      <span className="inline-flex items-center gap-2 h-9 px-3 text-[14px]"><span className="w-5 h-5 rounded-full border border-mt-border bg-[#F3F2EF]" />Background</span>
      <span className="inline-flex items-center gap-2 h-9 px-3 text-[14px]"><Maximize size={15} />Resize</span>
    </div>
  );
}

function FxPopover({ s }: { s: S }) {
  const sample = (l: string): CSSProperties => {
    const b: CSSProperties = { fontWeight: 800, fontSize: 22, color: '#09090B' };
    if (l === 'Glow') return { ...b, color: '#fff', textShadow: '0 0 6px #A69BD3, 0 0 12px #A69BD3' };
    if (l === 'Neon') return { ...b, color: '#F2708F', textShadow: '0 0 6px #F2708F, 0 0 14px #F2708F' };
    if (l === 'Shadow') return { ...b, textShadow: '2px 2px 3px rgba(9,9,11,.45)' };
    if (l === 'Lift') return { ...b, textShadow: '0 6px 8px rgba(0,0,0,.3)' };
    if (l === 'Echo') return { ...b, textShadow: '3px 3px 0 #8CCBFF' };
    if (l === 'Hollow') return { ...b, color: 'transparent', WebkitTextStroke: '1.2px #09090B' };
    if (l === 'Retro') return { ...b, color: '#F2708F', textShadow: '3px 3px 0 #1A1A1A' };
    if (l === 'Pop') return { ...b, color: '#fff', textShadow: '4px 4px 0 #F2708F', WebkitTextStroke: '.6px #09090B' };
    if (l === 'Dreamy') return { ...b, color: '#A69BD3', textShadow: '0 1px 10px rgba(166,155,211,.9)' };
    return b;
  };
  const cur = s.fx === 'glow' ? 'Glow' : s.fx === 'echo' ? 'Echo' : 'None';
  return (
    <div className="absolute left-[560px] top-[60px] w-[320px] rounded-2xl bg-mt-surface border border-mt-border shadow-2xl p-4 mt-howto-pop">
      <p className="text-[15px] font-semibold mb-2">Look</p>
      <div className="grid grid-cols-4 gap-1.5">
        {LOOKS.map((l) => (
          <span key={l} data-t={`fx-${l.toLowerCase()}`} className={cx('h-[62px] rounded-xl border flex flex-col items-center justify-center gap-0.5', cur === l ? 'border-[#3B82C4] ring-1 ring-[#3B82C4] bg-mt-surface2' : 'border-mt-border')}>
            <span style={sample(l)}>Ag</span><span className="text-[11px] text-mt-muted">{l}</span>
          </span>
        ))}
      </div>
      <p className="text-[14px] font-semibold mt-3">Outline</p>
      <p className="text-[14px] font-semibold mt-2">Highlight</p>
      <p className="text-[14px] font-semibold mt-2">Shape</p>
    </div>
  );
}

function Dialog({ title, icon, children, footer, w = 560 }: { title: string; icon: ReactNode; children: ReactNode; footer: ReactNode; w?: number }) {
  return (
    <div className="absolute z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-mt-surface shadow-2xl overflow-hidden mt-howto-pop" style={{ width: w }}>
      <div className="h-16 px-6 flex items-center justify-between border-b border-mt-border"><span className="inline-flex items-center gap-2 text-[18px] font-semibold">{icon}{title}</span><X size={20} className="text-mt-muted" /></div>
      <div className="p-6">{children}</div>
      <div className="px-6 py-4 border-t border-mt-border flex justify-end gap-2">{footer}</div>
    </div>
  );
}

function TranslateDlg({ s }: { s: S }) {
  const shown = s.search ? LANGS.filter(([n]) => n.toLowerCase().startsWith(s.search.toLowerCase())) : LANGS;
  return (
    <Dialog
      title="Translate"
      icon={<Languages size={19} className="text-[#3B82C4]" />}
      footer={<>
        <span data-t="tr-close" className="h-11 px-5 rounded-xl border border-mt-border text-[15px] font-medium grid place-items-center">Close</span>
        <span data-t="tr-go" className="h-11 px-5 rounded-xl bg-mt-primary text-mt-onprimary text-[15px] font-semibold inline-flex items-center gap-2">{s.busy ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}{s.busy ? 'Translating…' : `Translate to ${s.langPick ? 'Arabic' : '…'}`}</span>
      </>}
    >
      <p className="text-[15px] font-semibold mb-2">Language</p>
      <span data-t="tr-search" className={cx('h-11 rounded-xl border px-3 flex items-center gap-2 text-[15px]', s.search ? 'border-[#3B82C4]' : 'border-mt-input-border text-mt-faint')}><Search size={17} />{s.search || 'Search languages'}{s.search && <span className="w-[2px] h-5 bg-mt-ink mt-howto-caret" />}</span>
      <div className="mt-2 grid grid-cols-3 gap-2 min-h-[64px]">
        {shown.map(([n, nat]) => (
          <span key={n} data-t={n === 'Arabic' ? 'tr-arabic' : undefined} className={cx('rounded-xl border px-3 py-2', s.langPick && n === 'Arabic' ? 'border-[#3B82C4] bg-[#E8F5FF] dark:bg-[#0E1D2B]' : 'border-mt-border')}>
            <span className="block text-[14px] font-medium">{n}</span><span className="block text-[13px] text-mt-muted">{nat}</span>
          </span>
        ))}
      </div>
      <p className="text-[15px] font-semibold mt-5 mb-2">Translate</p>
      <div className="flex gap-2">
        <span className={cx('flex-1 h-11 rounded-xl border grid place-items-center text-[14px] font-medium', !s.scopeAll ? 'border-[#3B82C4] bg-[#E8F5FF] dark:bg-[#0E1D2B]' : 'border-mt-border')}>Selected</span>
        <span data-t="tr-all" className={cx('flex-1 h-11 rounded-xl border grid place-items-center text-[14px] font-medium', s.scopeAll ? 'border-[#3B82C4] bg-[#E8F5FF] dark:bg-[#0E1D2B]' : 'border-mt-border')}>Whole design</span>
      </div>
      {s.done && <p className="mt-4 text-[14px] rounded-xl px-3 py-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 mt-howto-pop">Translated 9 texts into Arabic, with an Arabic font. Press Undo to go back.</p>}
    </Dialog>
  );
}

function ResizeDlg({ s }: { s: S }) {
  const P = [['Instagram post', '1080 × 1350 px'], ['Instagram square', '1080 × 1080 px'], ['Instagram story', '1080 × 1920 px'], ['Facebook post', '1200 × 630 px'], ['YouTube thumbnail', '1280 × 720 px'], ['TikTok post', '1080 × 1920 px']];
  return (
    <Dialog title="Resize" icon={<Wand2 size={19} className="text-[#3B82C4]" />} w={600} footer={<span data-t="rs-go" className="h-11 px-6 rounded-full bg-mt-primary text-mt-onprimary text-[15px] font-semibold grid place-items-center">Resize</span>}>
      <p className="text-[15px] text-mt-muted mb-4">Content is re-arranged to fit the new size — nothing gets stretched.</p>
      <div className="flex gap-2 mb-4">{['Social media', 'Business', 'Print', 'Events'].map((c, i) => <span key={c} className={cx('h-9 px-4 rounded-full text-[14px] grid place-items-center', i === 0 ? 'bg-mt-primary text-mt-onprimary' : 'border border-mt-border')}>{c}</span>)}</div>
      <div className="grid grid-cols-2 gap-2">
        {P.map(([n, d]) => (
          <span key={n} data-t={n === 'Instagram story' ? 'rs-story' : undefined} className={cx('rounded-xl border px-4 py-3', n === 'Instagram story' && s.storyPick ? 'border-[#3B82C4] bg-[#E8F5FF] dark:bg-[#0E1D2B]' : 'border-mt-border')}>
            <span className="block text-[15px] font-medium">{n}</span><span className="block text-[13px] text-mt-muted">{d}</span>
          </span>
        ))}
      </div>
    </Dialog>
  );
}

function ExportDlg({ s }: { s: S }) {
  const C = [[ImageIcon, 'PNG', 'Sharp graphics. Can be transparent.'], [FileImage, 'JPG', 'Small files, great for sharing.'], [FileText, 'PDF (vector)', 'Sharp text and shapes at any size.'], [Printer, 'PDF for print shops', 'Vector CMYK, bleed and crop marks.']] as const;
  return (
    <Dialog title="Download" icon={<Download size={19} className="text-[#3B82C4]" />} w={560} footer={<span data-t="ex-go" className="h-11 px-6 rounded-full bg-mt-primary text-mt-onprimary text-[15px] font-semibold inline-flex items-center gap-2">{s.preparing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{s.preparing ? 'Preparing…' : 'Download'}</span>}>
      <p className="text-[15px] font-semibold mb-2">File type</p>
      <div className="grid grid-cols-2 gap-2">
        {C.map(([I, n, d]) => (
          <span key={n} data-t={n === 'PDF (vector)' ? 'ex-pdf' : undefined} className={cx('rounded-xl border px-3 py-2.5 flex gap-2.5', (n === 'PDF (vector)' && s.pdfPick) || (!s.pdfPick && n === 'PNG') ? 'border-[#3B82C4] bg-[#E8F5FF] dark:bg-[#0E1D2B]' : 'border-mt-border')}>
            <I size={18} className="text-mt-muted shrink-0 mt-0.5" />
            <span><span className="block text-[15px] font-semibold">{n}</span><span className="block text-[12px] text-mt-muted leading-snug">{d}</span></span>
          </span>
        ))}
      </div>
      <p className="text-[15px] font-semibold mt-5 mb-2">Quality</p>
      <div className="flex gap-2">{['Screen', 'Standard', 'Print'].map((q, i) => <span key={q} className={cx('flex-1 h-11 rounded-xl border grid place-items-center text-[14px]', i === 2 ? 'border-[#3B82C4] bg-[#E8F5FF] dark:bg-[#0E1D2B]' : 'border-mt-border')}>{q}</span>)}</div>
    </Dialog>
  );
}

function MockupsDlg({ s }: { s: S }) {
  return (
    <Dialog title="Mockups" icon={<Layers size={19} className="text-[#3B82C4]" />} w={660} footer={<>
      <span data-t="mk-close" className="h-11 px-5 rounded-xl border border-mt-border text-[15px] font-medium grid place-items-center">Close</span>
      <span className="h-11 px-5 rounded-xl bg-mt-primary text-mt-onprimary text-[15px] font-semibold inline-flex items-center gap-2"><Download size={16} />Download picture</span>
    </>}>
      <div className="flex gap-5">
        <div className="relative flex-1 h-[380px] rounded-2xl overflow-hidden bg-[#E9E4DC]">
          {MOCKS.map(([id, name], i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={id} src={`/home/tutorial/mk-${id}.webp`} alt={name} className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500" style={{ opacity: i === s.mk ? 1 : 0 }} />
          ))}
          <span className="absolute left-3 bottom-3 rounded-full bg-black/70 px-3 py-1 text-[12px] font-semibold text-white">{MOCKS[s.mk][1]}</span>
        </div>
        <div className="w-[170px] grid grid-cols-2 gap-2 content-start">
          {MOCKS.map(([id, name], i) => (
            <span key={id} data-t={`mk-${i}`} className={cx('relative aspect-square rounded-xl overflow-hidden ring-2', i === s.mk ? 'ring-[#3B82C4]' : 'ring-transparent')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/home/tutorial/mk-${id}.webp`} alt="" className="w-full h-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10px] px-1.5 py-0.5 truncate">{name}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex gap-2 text-[13px]">{['All', 'Rooms', 'Print', 'Screens', 'Merch'].map((g, i) => <span key={g} className={cx('h-8 px-3 rounded-full grid place-items-center', i === 0 ? 'bg-mt-primary text-mt-onprimary' : 'border border-mt-border')}>{g}</span>)}</div>
    </Dialog>
  );
}

// The "Growth Summit" business poster, drawn in its own 1080-wide units and
// scaled: an editorial layout with a full-bleed speaker photo, stats and a
// glass name tag. Post (1080×1350) and story (1080×1920) layouts, English
// and Arabic, two brand kits (Northwind → Aurum Capital), and a cut-out
// version of the photo once its background is removed.
const SPEC = 'linear-gradient(90deg,#F2708F 0%,#A69BD3 22%,#35C2F1 45%,#5DCCB8 64%,#8CC84B 82%,#DDE23B 100%)';
const KITS: Record<Brand, { name: string; mark: string; head: string; grad: string; solid: string; kicker: string; bg: string; dark: string; ink: string; muted: string; swatches: string[] }> = {
  nw: { name: 'NORTHWIND', mark: 'N', head: 'Sora, sans-serif', grad: SPEC, solid: '#35C2F1', kicker: '#35C2F1', bg: 'radial-gradient(120% 80% at 100% 0%, #1B2F63 0%, #0B1630 55%, #070E20 100%)', dark: '#0B1630', ink: '#0B1630', muted: '#9FB0D0', swatches: ['#0B1630', '#F2708F', '#35C2F1', '#8CC84B'] },
  au: { name: 'AURUM CAPITAL', mark: 'A', head: "'Playfair Display', Georgia, serif", grad: 'linear-gradient(90deg,#F7E7B4 0%,#E2B865 45%,#B8862F 100%)', solid: '#E2B865', kicker: '#E2B865', bg: 'radial-gradient(120% 80% at 100% 0%, #3A2C17 0%, #15100A 55%, #0A0805 100%)', dark: '#15100A', ink: '#15100A', muted: '#C9B99A', swatches: ['#15100A', '#E2B865', '#F7E7B4', '#FFFFFF'] },
};

function Design({ s, k }: { s: S; k: number }) {
  const story = s.story;
  const ar = s.lang === 'ar';
  const kit = KITS[s.brand];
  const T = 'all .9s cubic-bezier(.6,0,.3,1)';
  const L = story
    ? { H: 1920, photo: [0, 0, 1080, 1060], kicker: 1010, head: 1060, sub: 1370, stats: 1480, tag: [80, 800], info: 1610, cta: 1790, colW: 920 }
    : { H: 1350, photo: [470, 0, 610, 930], kicker: 300, head: 350, sub: 760, stats: 880, tag: [560, 780], info: 1075, cta: 1225, colW: 560 };
  const sans = ar ? 'Cairo, sans-serif' : kit.head;
  const body = ar ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const align: CSSProperties = ar ? { direction: 'rtl', textAlign: 'right' } : { textAlign: 'left' };
  const grad: CSSProperties = { background: kit.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' };
  const fx: CSSProperties = s.fx === 'glow' ? { filter: `drop-shadow(0 0 14px ${s.brand === 'au' ? 'rgba(247,231,180,.8)' : 'rgba(143,227,255,.9)'}) drop-shadow(0 0 28px ${s.brand === 'au' ? 'rgba(226,184,101,.55)' : 'rgba(53,194,241,.6)'})` } : s.fx === 'echo' ? { textShadow: s.brand === 'au' ? '9px 9px 0 rgba(226,184,101,.45), 18px 18px 0 rgba(184,134,47,.3)' : '9px 9px 0 rgba(53,194,241,.55), 18px 18px 0 rgba(242,112,143,.35)' } : {};
  const selBox = (on: boolean): CSSProperties => (on ? { outline: `${3 / k}px solid #3B82C4`, outlineOffset: 8 / k } : {});
  const info = ar
    ? [['التاريخ', '١٤ مارس ٢٠٢٧'], ['المكان', 'مركز دبي التجاري العالمي'], ['الوقت', '٩:٠٠ صباحًا']]
    : [['DATE', '14 MAR 2027'], ['VENUE', 'Dubai World Trade Centre'], ['TIME', '9:00 AM']];
  const stats = ar ? [['+٤٠', 'متحدثًا'], ['٢', 'يومان'], ['١٬٢٠٠', 'قائد']] : [['40+', 'speakers'], ['2', 'days'], ['1,200', 'leaders']];
  const [px, py, pw, ph] = L.photo;
  const fadeTo = s.brand === 'au' ? '10,8,5' : '7,14,32';
  return (
    <div className="absolute left-0 top-0 origin-top-left overflow-hidden shadow-[0_24px_50px_-20px_rgba(9,9,11,0.55)]" style={{ width: 1080, height: L.H, transform: `scale(${k})`, background: kit.bg, transition: T }}>
      {/* speaker photo: full bleed, fading into the background */}
      <span data-t="photo" className="absolute" style={{ left: px, top: py, width: pw, height: ph, transition: T, ...selBox(s.sel === 'photo') }}>
        <span className="absolute inset-0 overflow-hidden">
          {!s.cut ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.photo} src={PH(s.photo)} alt="" className={cx('absolute inset-0 w-full h-full object-cover', s.photo !== 813 && 'mt-howto-pop')} style={{ objectPosition: s.photo === 813 ? '40% 22%' : '50% 18%' }} />
          ) : (
            <>
              <span className="absolute rounded-full mt-howto-pop" style={{ width: story ? 820 : 600, height: story ? 820 : 600, left: story ? 130 : 30, top: story ? 120 : 170, background: kit.grad, opacity: 0.9, transition: T }} />
              <span className="absolute rounded-full" style={{ width: story ? 980 : 720, height: story ? 980 : 720, left: story ? 50 : -30, top: story ? 40 : 110, border: `3px solid ${kit.solid}`, opacity: 0.35, transition: T }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/home/tutorial/speaker-cutout.webp" alt="" className="absolute mt-howto-pop" style={{ height: story ? 1000 : 900, left: story ? 210 : 40, bottom: 0, transition: T }} />
            </>
          )}
          {s.swapping && <span className="absolute inset-0 mt-howto-shimmer" />}
        </span>
        <span className="absolute inset-0 pointer-events-none" style={{ background: story || s.cut ? `linear-gradient(180deg, rgba(${fadeTo},0) ${s.cut ? 75 : 55}%, rgba(${fadeTo},1) 100%)` : `linear-gradient(90deg, rgba(${fadeTo},1) 0%, rgba(${fadeTo},0) 30%), linear-gradient(180deg, rgba(${fadeTo},0) 70%, rgba(${fadeTo},1) 100%)`, transition: T }} />
      </span>
      {/* logo */}
      <span className="absolute flex items-center gap-4" style={{ left: 80, top: 80, transition: T }}>
        <span className="w-12 h-12 rounded-full grid place-items-center" style={{ background: kit.grad, fontFamily: kit.head, fontWeight: 800, fontSize: 24, color: kit.ink }}>{s.brand === 'au' ? 'A' : ''}</span>
        <span style={{ fontFamily: kit.head, fontWeight: 800, fontSize: 28, color: '#fff', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>{kit.name}</span>
      </span>
      {/* kicker + headline */}
      <span className="absolute" style={{ left: 80, width: L.colW, top: L.kicker, ...align, fontFamily: body, fontWeight: 600, fontSize: 22, letterSpacing: ar ? 0 : '0.24em', color: kit.kicker, transition: T }}>{ar ? 'قمة الأعمال · ٢٠٢٧' : 'BUSINESS SUMMIT · 2027'}</span>
      <span data-t="headline" className="absolute" style={{ left: 80, width: L.colW, top: L.head, fontFamily: sans, fontWeight: s.brand === 'au' && !ar ? 700 : 800, fontSize: ar ? 112 : story ? 128 : 120, lineHeight: ar ? 1.2 : 1.0, letterSpacing: s.brand === 'au' ? '-0.01em' : '-0.02em', color: '#fff', whiteSpace: 'pre-line', transition: T, ...align, ...fx, ...selBox(s.sel === 'headline') }}>
        {ar ? 'قُد العقد\n' : story ? 'Lead the\nnext ' : 'Lead\nthe next\n'}<span key={s.brand} style={grad}>{ar ? 'القادم' : 'decade.'}</span>
      </span>
      <span className="absolute" style={{ left: 80, top: L.sub, width: story ? 900 : 470, fontFamily: body, fontSize: 30, lineHeight: 1.45, color: kit.muted, transition: T, ...align }}>
        {ar ? 'يومان من الاستراتيجية والذكاء الاصطناعي والقيادة.' : 'Two days of strategy, AI and leadership.'}
      </span>
      {/* stats */}
      <span className="absolute flex gap-4" style={{ left: 80, top: L.stats, transition: T, direction: ar ? 'rtl' : 'ltr' }}>
        {stats.map(([n, l]) => (
          <span key={l} className="rounded-2xl" style={{ padding: '16px 22px', background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.14)' }}>
            <span key={s.brand} className="block" style={{ fontFamily: sans, fontWeight: 800, fontSize: 40, lineHeight: 1, ...grad }}>{n}</span>
            <span className="block mt-1.5" style={{ fontFamily: body, fontSize: 18, color: kit.muted }}>{l}</span>
          </span>
        ))}
      </span>
      {/* glass name tag on the photo */}
      <span className="absolute rounded-2xl" style={{ left: L.tag[0], top: L.tag[1], padding: '18px 26px', background: `rgba(${fadeTo},.55)`, border: '1.5px solid rgba(255,255,255,.22)', backdropFilter: 'blur(10px)', transition: T }}>
        <span data-t="name" className="relative block" style={{ fontFamily: sans, fontWeight: 700, fontSize: 30, color: '#fff', letterSpacing: '0.06em', whiteSpace: 'pre', ...selBox(s.sel === 'name') }}>
          <span className={s.editing && s.name === 'DANIEL OKAFOR' ? 'bg-[#2563EB]' : ''}>{s.name}</span>
          {s.editing && <span className="inline-block w-[3px] h-[30px] align-middle bg-white mt-howto-caret" />}
        </span>
        <span className="block mt-1" style={{ fontFamily: body, fontSize: 21, color: kit.solid, ...align }}>{ar ? 'الرئيسة التنفيذية، نورث غيت' : 'CEO, Northgate Retail · Keynote'}</span>
      </span>
      {/* info row */}
      <span className="absolute flex" style={{ left: 80, right: 80, top: L.info, borderTop: '2px solid rgba(255,255,255,.14)', paddingTop: 26, transition: T, direction: ar ? 'rtl' : 'ltr' }}>
        {info.map(([lab, val], i) => (
          <span key={lab} className="flex-1" style={{ paddingInline: 6, borderInlineStart: i ? '2px solid rgba(255,255,255,.14)' : 'none', paddingInlineStart: i ? 26 : 0 }}>
            <span className="block" style={{ fontFamily: body, fontWeight: 600, fontSize: 18, letterSpacing: ar ? 0 : '0.2em', color: kit.kicker }}>{lab}</span>
            <span className="block mt-1" style={{ fontFamily: sans, fontWeight: 600, fontSize: 28, color: '#fff', lineHeight: 1.2 }}>{val}</span>
          </span>
        ))}
      </span>
      {/* call to action */}
      <span className="absolute flex items-center justify-between" style={{ left: 80, right: 80, top: L.cta, transition: T, direction: ar ? 'rtl' : 'ltr' }}>
        <span style={{ background: kit.grad, borderRadius: 999, padding: '20px 40px', fontFamily: sans, fontWeight: 700, fontSize: 28, color: kit.ink }}>{ar ? 'سجّل الآن ←' : 'Register now →'}</span>
        <span style={{ fontFamily: body, fontSize: 24, color: kit.muted, direction: 'ltr' }}>{s.brand === 'au' ? 'aurumcapital.ae/summit' : 'northwind.events/summit'}</span>
      </span>
    </div>
  );
}

function Img({ src, style }: { src: string; style: CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="absolute object-cover" style={style} />;
}

// For rendering stills of the poster (e.g. its mockups): not used by the page.
export { Design as HowToDesign, START as HOWTO_START };
