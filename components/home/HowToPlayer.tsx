'use client';

// The home page tutorial: a crisp, self-playing replica of the real editor
// layout (top bar, left rail, floating toolbar, pages bar), built with
// HTML/CSS so it is sharp at any size and weighs almost nothing. A cursor
// picks a corporate summit template, edits the speaker's name, adds a glow
// and echo effect, swaps the speaker photo, translates the design to
// Arabic (and undoes it), resizes it
// into a story and downloads a vector PDF. About a minute, on a loop.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, Undo2, Redo2, Wand2, FileText, Download, LayoutTemplate, Shapes, Type, Upload, Brush, PaintBucket, Palette,
  Layers, Files, HelpCircle, Bold, Italic, Underline, Strikethrough, AlignCenter, CaseSensitive, Spline, Newspaper, Sparkles, Languages, Minus, Plus,
  Droplet, Lock, Copy, Trash2, Replace, Crop, SlidersHorizontal, Scissors, Search, X, Check, Image as ImageIcon, FileImage, Printer, Loader2, Pause, Play, Maximize, Sun,
} from 'lucide-react';

const W = 1440, H = 900;
const PH = (n: number) => `/templates/photos/mt-${n}.jpg`;

type Dlg = 'none' | 'translate' | 'resize' | 'export';
interface S {
  step: number;
  cx: number; cy: number; click: number; down: boolean; target: string | null;
  panel: boolean; loaded: boolean;
  sel: 'name' | 'headline' | 'photo' | null; editing: boolean;
  name: string; fx: 'none' | 'glow' | 'echo'; fxOpen: boolean;
  photo: number; swapping: boolean;
  lang: 'en' | 'ar';
  dlg: Dlg; search: string; langPick: boolean; scopeAll: boolean; busy: boolean; done: boolean;
  storyPick: boolean; story: boolean;
  pdfPick: boolean; preparing: boolean; toast: string | null;
  fade: boolean;
}
const START: S = {
  step: 0, cx: 900, cy: 520, click: 0, down: false, target: null, panel: true, loaded: false, sel: null, editing: false,
  name: 'DANIEL OKAFOR', fx: 'none', fxOpen: false, photo: 813, swapping: false, lang: 'en',
  dlg: 'none', search: '', langPick: false, scopeAll: false, busy: false, done: false, storyPick: false, story: false,
  pdfPick: false, preparing: false, toast: null, fade: false,
};
type Ev = [number, Partial<S> | ((s: S) => Partial<S>)];

const STEPS = [
  { at: 0, title: 'Pick a template', sub: '700+ designs, ready in a tap' },
  { at: 4000, title: 'Make the words yours', sub: 'Click any text and type' },
  { at: 10500, title: 'Add a little magic', sub: 'Glow, echo, neon — one click' },
  { at: 18300, title: 'Swap in your photo', sub: 'It fits the frame perfectly' },
  { at: 23500, title: 'Translate in one click', sub: 'Arabic, French, Hindi… right fonts too' },
  { at: 37800, title: 'Resize for anywhere', sub: 'Post to story — nothing stretched' },
  { at: 45000, title: 'Download print-ready', sub: 'Vector PDF, sharp at any size' },
];

function buildTimeline() {
  const evs: Ev[] = [];
  const at = (ms: number, p: Ev[1]) => evs.push([ms, p]);
  const move = (ms: number, id: string) => at(ms, { target: id });
  const click = (ms: number) => { at(ms, { down: true }); at(ms + 150, (s) => ({ down: false, click: s.click + 1 })); };
  const type = (ms: number, text: string, every: number, key: 'name' | 'search') => { for (let i = 1; i <= text.length; i++) at(ms + i * every, { [key]: text.slice(0, i) } as Partial<S>); };

  at(0, { ...START });
  move(500, 'thumb0'); click(1700); at(1850, { loaded: true }); at(2500, { panel: false });
  // words
  at(4000, { step: 1 }); move(4300, 'name'); click(5100); at(5250, { sel: 'name' });
  click(5700); click(5900); at(6100, { editing: true });
  at(6800, { name: '' }); type(6800, 'LAYLA MANSOUR', 150, 'name');
  move(9100, 'empty'); click(9800); at(9950, { sel: null, editing: false });
  // effects
  at(10500, { step: 2 }); move(10800, 'headline'); click(11600); at(11750, { sel: 'headline' });
  move(12300, 'tb-effects'); click(13000); at(13150, { fxOpen: true });
  move(13700, 'fx-glow'); click(14400); at(14550, { fx: 'glow' });
  move(15300, 'fx-echo'); click(16000); at(16150, { fx: 'echo' });
  move(16900, 'empty'); click(17600); at(17750, { fxOpen: false, sel: null });
  // photo
  at(18300, { step: 3 }); move(18600, 'photo'); click(19300); at(19450, { sel: 'photo' });
  move(20000, 'tb-replace'); click(20700); at(20850, { swapping: true }); at(21500, { photo: 589 }); at(22300, { swapping: false });
  move(22500, 'empty'); click(23100); at(23250, { sel: null });
  // translate
  at(23500, { step: 4 }); move(23800, 'headline'); click(24500); at(24650, { sel: 'headline' });
  move(25200, 'tb-translate'); click(25900); at(26050, { dlg: 'translate' });
  move(26700, 'tr-search'); click(27300); type(27400, 'Arab', 160, 'search');
  move(28400, 'tr-arabic'); click(29100); at(29250, { langPick: true });
  move(29800, 'tr-all'); click(30500); at(30650, { scopeAll: true });
  move(31100, 'tr-go'); click(31800); at(31950, { busy: true }); at(32900, { busy: false, done: true, lang: 'ar' });
  move(33700, 'tr-close'); click(34500); at(34650, { dlg: 'none', sel: null, search: '', langPick: false, scopeAll: false, done: false });
  move(35500, 'undo'); click(36400); at(36550, { lang: 'en', toast: 'Undo · back to English' }); at(37600, { toast: null });
  // resize
  at(37800, { step: 5 }); move(38100, 'top-resize'); click(38900); at(39050, { dlg: 'resize' });
  move(39700, 'rs-story'); click(40400); at(40550, { storyPick: true });
  move(41100, 'rs-go'); click(41800); at(41950, { dlg: 'none', story: true, storyPick: false });
  // download
  at(45000, { step: 6 }); move(45300, 'top-export'); click(46100); at(46250, { dlg: 'export' });
  move(46900, 'ex-pdf'); click(47600); at(47750, { pdfPick: true });
  move(48300, 'ex-go'); click(49000); at(49150, { preparing: true });
  at(50600, { preparing: false, dlg: 'none', pdfPick: false, toast: 'Growth Summit 2027.pdf saved · vector, print-ready' });
  move(51200, 'empty'); at(54500, { toast: null }); at(56500, { fade: true });
  const total = 57400;
  evs.sort((a, b) => a[0] - b[0]);
  return { evs, total };
}

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export function HowToPlayer() {
  const { evs, total } = useMemo(buildTimeline, []);
  const [s, setS] = useState<S>(START);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(0.6);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const clock = useRef({ t: 0, idx: 0, last: 0 });

  useEffect(() => setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    setScale(el.clientWidth / W);
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

  const jump = (i: number) => {
    const target = STEPS[i].at;
    let st = START, idx = 0;
    while (idx < evs.length && evs[idx][0] <= target) { const p = evs[idx][1]; st = { ...st, ...(typeof p === 'function' ? p(st) : p) }; idx++; }
    clock.current = { t: target, idx, last: performance.now() };
    setS(st);
    setPlaying(true);
  };
  const view: S = reduced ? { ...START, panel: false, loaded: true, name: 'LAYLA MANSOUR', fx: 'glow', photo: 589, step: 0 } : s;
  const step = STEPS[view.step];

  return (
    <div className="relative select-none">
      <FontFaces />
      <div ref={boxRef} className="relative w-full overflow-hidden" style={{ height: H * scale }} role="img" aria-label="How Magical Touch works: an animated walkthrough of the editor">
        <div ref={stageRef} className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <Stage s={view} />
          {/* caption */}
          <div className="absolute right-[44px] top-[330px] pointer-events-none z-40" style={{ opacity: view.fade ? 0 : 1, transition: 'opacity .5s' }}>
            <div key={view.step} className="mt-howto-caption relative rounded-[22px] bg-black/80 text-white px-7 py-5 shadow-2xl ring-1 ring-white/10 w-[360px]">
              <span className="mt-howto-spark" aria-hidden><Sparkles size={26} /></span>
              <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#8FE3FF]">Step {view.step + 1} of {STEPS.length}</p>
              <p className="text-[27px] font-semibold leading-tight mt-0.5">{step.title}</p>
              <p className="text-[17px] text-white/75">{step.sub}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative flex items-center gap-1.5 px-2 sm:px-3 py-2 border-t border-mt-border bg-mt-surface overflow-x-auto no-scrollbar">
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
  return <style dangerouslySetInnerHTML={{ __html: [f('Sora', 400), f('Sora', 600), f('Sora', 800), f('Inter', 400), f('Inter', 600), f('Cairo', 400), f('Cairo', 700)].join('') }} />;
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
          <span className="ml-2 inline-flex rounded-full border border-mt-border p-0.5 text-[13px]"><span className="px-3 py-1 rounded-full bg-mt-surface2 text-mt-ink">Simple</span><span className="px-3 py-1">Pro</span></span>
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
          <span key={r.l} className={cx('w-[66px] py-2 rounded-xl flex flex-col items-center gap-1 text-[11px]', i === 0 && s.panel ? 'bg-mt-surface2 text-mt-ink' : i === 6 ? 'text-[#3B82C4]' : 'text-mt-muted')}>
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
        {[[Crop, 'Crop'], [SlidersHorizontal, 'Adjust'], [Scissors, 'Remove BG'], [Wand2, 'Edit photo']].map(([I, l]: any) => <span key={l} className="inline-flex items-center gap-1.5 h-9 px-3 text-[14px]"><I size={16} />{l}</span>)}
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

// The "Growth Summit" corporate poster, drawn in its own 1080-wide units
// and scaled. Positions follow the post (1080×1350) or story (1080×1920)
// layout, and every word has an English and an Arabic version.
const SPEC = 'linear-gradient(90deg,#F2708F 0%,#A69BD3 22%,#35C2F1 45%,#5DCCB8 64%,#8CC84B 82%,#DDE23B 100%)';
function Design({ s, k }: { s: S; k: number }) {
  const story = s.story;
  const ar = s.lang === 'ar';
  const T = 'all .9s cubic-bezier(.6,0,.3,1)';
  const L = story
    ? { H: 1920, head: 330, sub: 660, photo: [80, 820, 920, 640], name: 1490, info: 1620, cta: 1790 }
    : { H: 1350, head: 270, sub: 590, photo: [620, 560, 380, 430], name: 1004, info: 1090, cta: 1225 };
  const sans = ar ? 'Cairo, sans-serif' : 'Sora, sans-serif';
  const body = ar ? 'Cairo, sans-serif' : 'Inter, sans-serif';
  const align: CSSProperties = ar ? { direction: 'rtl', textAlign: 'right' } : { textAlign: 'left' };
  const grad: CSSProperties = { background: SPEC, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
  const fx: CSSProperties = s.fx === 'glow' ? { filter: 'drop-shadow(0 0 14px rgba(143,227,255,.9)) drop-shadow(0 0 28px rgba(53,194,241,.6))' } : s.fx === 'echo' ? { textShadow: '9px 9px 0 rgba(53,194,241,.55), 18px 18px 0 rgba(242,112,143,.35)' } : {};
  const selBox = (on: boolean): CSSProperties => (on ? { outline: `${3 / k}px solid #3B82C4`, outlineOffset: 8 / k } : {});
  const info = ar
    ? [['التاريخ', '١٤ مارس ٢٠٢٧'], ['المكان', 'مركز دبي التجاري العالمي'], ['الوقت', '٩:٠٠ صباحًا']]
    : [['DATE', '14 MAR 2027'], ['VENUE', 'Dubai World Trade Centre'], ['TIME', '9:00 AM']];
  const [px, py, pw, ph] = L.photo;
  return (
    <div className="absolute left-0 top-0 origin-top-left overflow-hidden shadow-[0_24px_50px_-20px_rgba(9,9,11,0.55)]" style={{ width: 1080, height: L.H, transform: `scale(${k})`, background: 'radial-gradient(120% 80% at 100% 0%, #1B2F63 0%, #0B1630 55%, #070E20 100%)', transition: T }}>
      {/* dot grid + brand ribbon */}
      <span className="absolute" style={{ left: 60, top: 70, width: 260, height: 120, backgroundImage: 'radial-gradient(rgba(255,255,255,.18) 2px, transparent 2.5px)', backgroundSize: '26px 26px' }} />
      <svg className="absolute" style={{ left: 0, top: 0, width: 1080, height: 400 }} viewBox="0 0 1080 400" fill="none" aria-hidden>
        <defs><linearGradient id="ht-r" x1="560" y1="0" x2="1140" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#F2708F" /><stop offset=".3" stopColor="#A69BD3" /><stop offset=".55" stopColor="#35C2F1" /><stop offset=".78" stopColor="#5DCCB8" /><stop offset="1" stopColor="#DDE23B" /></linearGradient></defs>
        <path d="M560 -60 C 640 120, 820 210, 1140 190" stroke="url(#ht-r)" strokeWidth="54" strokeLinecap="round" opacity=".95" />
        <path d="M610 -60 C 700 160, 880 260, 1140 250" stroke="url(#ht-r)" strokeWidth="5" strokeLinecap="round" opacity=".55" />
      </svg>
      {/* header */}
      <span className="absolute flex items-center gap-4" style={{ left: 80, top: 80, transition: T }}>
        <span className="w-12 h-12 rounded-full" style={{ background: SPEC }} />
        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 30, color: '#fff', letterSpacing: '0.12em' }}>NORTHWIND</span>
      </span>
      <span className="absolute" style={{ left: 80, right: 80, top: L.head - 56, ...align, fontFamily: body, fontWeight: 600, fontSize: 22, letterSpacing: ar ? 0 : '0.22em', color: '#35C2F1', transition: T }}>{ar ? 'قمة الأعمال · ٢٠٢٧' : 'BUSINESS SUMMIT · 2027'}</span>
      {/* headline */}
      <span data-t="headline" className="absolute" style={{ left: 80, right: 80, top: L.head, fontFamily: sans, fontWeight: 800, fontSize: ar ? 118 : 124, lineHeight: ar ? 1.25 : 1.02, color: '#fff', whiteSpace: 'pre-line', transition: T, ...align, ...fx, ...selBox(s.sel === 'headline') }}>
        {ar ? 'قُد العقد\n' : 'Lead the\nnext '}<span style={grad}>{ar ? 'القادم' : 'decade'}</span>
      </span>
      <span className="absolute" style={{ left: 80, top: L.sub, width: story ? 920 : 500, fontFamily: body, fontSize: 30, lineHeight: 1.45, color: '#B9C4DA', transition: T, ...align }}>
        {ar ? 'يومان من الاستراتيجية والذكاء الاصطناعي والقيادة مع ٤٠ متحدثًا.' : 'Two days of strategy, AI and leadership with 40 speakers.'}
      </span>
      {/* speaker */}
      <span data-t="photo" className="absolute overflow-hidden" style={{ left: px, top: py, width: pw, height: ph, borderRadius: 36, padding: 5, background: SPEC, transition: T, ...selBox(s.sel === 'photo') }}>
        <span className="relative block w-full h-full overflow-hidden" style={{ borderRadius: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={s.photo} src={PH(s.photo)} alt="" className={cx('absolute inset-0 w-full h-full object-cover', s.photo !== 813 && 'mt-howto-pop')} style={{ objectPosition: s.photo === 813 ? '42% 25%' : '50% 22%' }} />
          {s.swapping && <span className="absolute inset-0 mt-howto-shimmer" />}
        </span>
      </span>
      <span className="absolute" style={{ left: story ? 80 : px, top: L.name, transition: T }}>
        <span data-t="name" className="relative block" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 30, color: '#fff', letterSpacing: '0.06em', whiteSpace: 'pre', ...selBox(s.sel === 'name') }}>
          <span className={s.editing && s.name === 'DANIEL OKAFOR' ? 'bg-[#2563EB]' : ''}>{s.name}</span>
          {s.editing && <span className="inline-block w-[3px] h-[30px] align-middle bg-white mt-howto-caret" />}
        </span>
        <span className="block mt-1" style={{ fontFamily: body, fontSize: 22, color: '#9FB0D0', ...align }}>{ar ? 'الرئيسة التنفيذية، نورث غيت' : 'CEO, Northgate Retail'}</span>
      </span>
      {/* info row */}
      <span className="absolute flex" style={{ left: 80, right: 80, top: L.info, borderTop: '2px solid rgba(255,255,255,.14)', paddingTop: 26, transition: T, direction: ar ? 'rtl' : 'ltr' }}>
        {info.map(([lab, val], i) => (
          <span key={lab} className="flex-1" style={{ paddingInline: 6, borderInlineStart: i ? '2px solid rgba(255,255,255,.14)' : 'none', paddingInlineStart: i ? 26 : 0 }}>
            <span className="block" style={{ fontFamily: body, fontWeight: 600, fontSize: 18, letterSpacing: ar ? 0 : '0.2em', color: '#35C2F1' }}>{lab}</span>
            <span className="block mt-1" style={{ fontFamily: sans, fontWeight: 600, fontSize: 28, color: '#fff', lineHeight: 1.2 }}>{val}</span>
          </span>
        ))}
      </span>
      {/* call to action */}
      <span className="absolute flex items-center justify-between" style={{ left: 80, right: 80, top: L.cta, transition: T, direction: ar ? 'rtl' : 'ltr' }}>
        <span style={{ background: SPEC, borderRadius: 999, padding: '20px 40px', fontFamily: sans, fontWeight: 700, fontSize: 28, color: '#0B1630' }}>{ar ? 'سجّل الآن ←' : 'Register now →'}</span>
        <span style={{ fontFamily: body, fontSize: 24, color: '#9FB0D0', direction: 'ltr' }}>northwind.events/summit</span>
      </span>
    </div>
  );
}

function Img({ src, style }: { src: string; style: CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="absolute object-cover" style={style} />;
}
