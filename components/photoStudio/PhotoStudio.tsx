'use client';

// Photo Studio: a focused photo editor with only tools that work well.
//   Simple mode: Enhance · Looks · Crop · Background · Retouch · Resize · Export
//   Pro mode adds: full Light/Detail sliders + histogram, a Colour tool
//   (levels, curves, per-colour HSL, colour grading) and more brushes
//   (dodge, burn, sharpen) with strength and hardness.
// While a slider is being dragged the preview is drawn from a small draft
// copy so it follows the finger instantly; the full preview follows on release.
// Adjustments stay live (non-destructive) on top of the picture; crop,
// heal, background removal and resize change the pixels, each step undoable.
// Used full-screen on /photo-studio and inside the Design editor's
// "Photo Editing" workspace, where "Apply to design" puts the result back
// into the SAME picture on the page.

import type { CSSProperties } from 'react';
import { forwardRef, ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  SlidersHorizontal, Sparkles, Crop as CropIcon, Scissors, Brush, Maximize2, Download, Undo2, Redo2, Plus, Minus,
  Maximize, RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2, Loader2, Check, X, Eye, Printer, Lock, Unlock, Palette, Wand2,
  Move, BoxSelect, Blend as BlendIcon, Hand, ZoomIn, Pipette, Type as TypeIcon, Eraser, Droplet, Sun, Circle, ArrowLeftRight, Square, PaintBucket,
} from 'lucide-react';
import { Adjust, NO_ADJUST, LIGHT_SLIDERS, COLOR_SLIDERS, DETAIL_SLIDERS, LOOKS, SliderDef, applyAdjust, renderAdjusted, isNeutral, autoEnhance, HSL_RANGES, CurvePts, curveLut } from '@/lib/photo/adjust';
import { BrushKind, createStroke, replayStroke } from '@/lib/photo/brushes';
import { CropBox, PhysUnit, cropTo, flip, fmtNum, fromPx, inscribedRect, makeCanvas, resample, rotate90, spotHeal, toPx, fillBackground, hasTransparency } from '@/lib/photo/ops';
import { ColourMode, FORMAT_INFO, PhotoFormat, downloadBlob, exportPhoto, extFor } from '@/lib/photo/exportPhoto';
import { loadProofTable, proofRgbaInPlace, PRESS_PROFILE_NAME } from '@/lib/color/cmyk';
import { BgRemoveDialog } from '@/components/editor/shell/BgRemoveDialog';
import { Layer, Selection, makeLayer, composite, isPlain, translate, placeImage, mergeDown, maskShape, maskAll, invertMask, maskFromAlpha, blendMasked, clearMasked, copyMasked, fillMasked, paintStroke, blankLike } from '@/lib/photo/layers';
import { FILTERS, FilterId, applyFilter } from '@/lib/photo/filters';
import { ProMenuBar, LayersPanel, HistoryPanel, Menu } from './ProPanels';
import { GOOGLE_FONTS, allFontFacesCSS, ensureFontLoaded } from '@/lib/editor/googleFonts';

type Tool = 'adjust' | 'color' | 'looks' | 'crop' | 'bg' | 'retouch' | 'resize' | 'export' | 'move' | 'select' | 'filter' | 'hand' | 'zoom' | 'eyedropper' | 'text' | 'gradient' | 'shape' | 'bucket';
// Tools that work directly on the picture (the rest are panels).
const CANVAS_TOOLS: Tool[] = ['move', 'select', 'crop', 'retouch', 'hand', 'zoom', 'eyedropper', 'text', 'gradient', 'shape', 'bucket', 'bg', 'resize', 'export'];
// The same font library as the design editor (loaded on demand).
const FONT_GROUPS = (['Sans Serif', 'Serif', 'Display', 'Script', 'Classic', 'Monospace', 'World'] as const).map((c) => ({ c, fonts: GOOGLE_FONTS.filter((f) => f.category === c).map((f) => f.family) }));
type TextEffect = 'none' | 'shadow' | 'glow' | 'outline' | 'neon' | 'retro' | 'highlight' | 'lift';
const TEXT_EFFECTS: { id: TextEffect; label: string; css: CSSProperties }[] = [
  { id: 'none', label: 'None', css: {} },
  { id: 'shadow', label: 'Shadow', css: { textShadow: '2px 2px 4px rgba(0,0,0,0.55)' } },
  { id: 'lift', label: 'Lift', css: { textShadow: '0 6px 10px rgba(0,0,0,0.35)' } },
  { id: 'glow', label: 'Glow', css: { textShadow: '0 0 8px #8CCBFF, 0 0 16px #8CCBFF' } },
  { id: 'neon', label: 'Neon', css: { color: '#fff', textShadow: '0 0 6px #F2708F, 0 0 14px #F2708F' } },
  { id: 'outline', label: 'Outline', css: { WebkitTextStroke: '1.5px #09090B', color: '#fff' } as any },
  { id: 'retro', label: 'Retro', css: { color: '#F2708F', WebkitTextStroke: '1px #FFF4E0', textShadow: '3px 3px 0 #1A1A1A' } as any },
  { id: 'highlight', label: 'Highlight', css: { background: '#F7C948', padding: '0 4px' } },
];
type Mode = 'simple' | 'pro';
type RetouchKind = 'heal' | BrushKind | 'paint' | 'erase';
const RETOUCH: { id: RetouchKind; label: string; hint: string; pro?: boolean }[] = [
  { id: 'paint', label: 'Paint', hint: 'Paint with a colour on the selected layer.', pro: true },
  { id: 'erase', label: 'Eraser', hint: 'Erase the selected layer to see-through.', pro: true },
  { id: 'heal', label: 'Heal', hint: 'Paint over spots, blemishes or small objects to remove them.' },
  { id: 'smudge', label: 'Smudge', hint: 'Push and blend colours, like a finger in wet paint.' },
  { id: 'blur', label: 'Soften', hint: 'Soften skin or a busy area by painting over it.' },
  { id: 'dodge', label: 'Dodge', hint: 'Lighten where you paint (eyes, faces, highlights).', pro: true },
  { id: 'burn', label: 'Burn', hint: 'Darken where you paint (edges, shadows, depth).', pro: true },
  { id: 'sharpen', label: 'Sharpen', hint: 'Crisp up details where you paint (eyes, text, textures).', pro: true },
];
const SIMPLE_LIGHT: SliderDef[] = [
  { key: 'exposure', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
];
const SIMPLE_COLOR: SliderDef[] = [
  { key: 'temperature', label: 'Warmth', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
];
const SIMPLE_DETAIL: SliderDef[] = [
  { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
  { key: 'vignette', label: 'Vignette', min: -100, max: 100 },
];
interface Snapshot { layers: Layer[]; active: number; adjust: Adjust; dpi: number; label: string }
// What an edit can change. `base` replaces the selected layer's pixels.
type SnapPatch = { label: string; base?: HTMLCanvasElement; layers?: Layer[]; active?: number; adjust?: Adjust; dpi?: number };

export interface PhotoStudioHandle {
  /** The finished picture at full size, adjustments included. */
  renderResult: () => HTMLCanvasElement | null;
  getDpi: () => number;
  /** Embedded mode: same as pressing "Apply to design". */
  applyNow: () => boolean;
  undo: () => void;
  redo: () => void;
}

export interface PhotoStudioProps {
  source: string;
  dpi?: number;
  name?: string;
  embedded?: boolean;
  onApply?: (dataUrl: string) => void | Promise<void>;
  onCancel?: () => void;
  onDpiChange?: (dpi: number) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
}

const PREVIEW_MAX = 2200;
const MAX_HISTORY = 24;
const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

const RATIOS: { id: string; label: string; r: number | null | 'orig' }[] = [
  { id: 'free', label: 'Free', r: null },
  { id: 'orig', label: 'Original', r: 'orig' },
  { id: '1:1', label: '1:1', r: 1 },
  { id: '4:5', label: '4:5', r: 4 / 5 },
  { id: '5:4', label: '5:4', r: 5 / 4 },
  { id: '3:2', label: '3:2', r: 3 / 2 },
  { id: '2:3', label: '2:3', r: 2 / 3 },
  { id: '4:3', label: '4:3', r: 4 / 3 },
  { id: '3:4', label: '3:4', r: 3 / 4 },
  { id: '16:9', label: '16:9', r: 16 / 9 },
  { id: '9:16', label: '9:16', r: 9 / 16 },
];
const SIZE_PRESETS: { label: string; w: number; h: number; unit: PhysUnit; dpi: number }[] = [
  { label: 'Passport 35×45 mm', w: 35, h: 45, unit: 'mm', dpi: 300 },
  { label: 'Visa 2×2 in', w: 2, h: 2, unit: 'in', dpi: 300 },
  { label: '10×10 cm', w: 10, h: 10, unit: 'cm', dpi: 300 },
  { label: '4×6 in print', w: 4, h: 6, unit: 'in', dpi: 300 },
  { label: '5×7 in print', w: 5, h: 7, unit: 'in', dpi: 300 },
  { label: 'A4', w: 210, h: 297, unit: 'mm', dpi: 300 },
  { label: 'A5', w: 148, h: 210, unit: 'mm', dpi: 300 },
  { label: 'Instagram post', w: 1080, h: 1350, unit: 'px', dpi: 72 },
  { label: 'Instagram story', w: 1080, h: 1920, unit: 'px', dpi: 72 },
  { label: 'Facebook cover', w: 1640, h: 624, unit: 'px', dpi: 72 },
];

const TOOLS: { id: Tool; label: string; simpleLabel?: string; icon: any; standaloneOnly?: boolean; proOnly?: boolean }[] = [
  { id: 'adjust', label: 'Adjust', simpleLabel: 'Enhance', icon: SlidersHorizontal },
  { id: 'color', label: 'Colour', icon: Palette, proOnly: true },
  { id: 'looks', label: 'Looks', icon: Sparkles },
  { id: 'crop', label: 'Crop', icon: CropIcon },
  { id: 'bg', label: 'Background', icon: Scissors },
  { id: 'retouch', label: 'Retouch', icon: Brush },
  { id: 'resize', label: 'Resize', icon: Maximize2 },
  { id: 'export', label: 'Export', icon: Download, standaloneOnly: true },
  { id: 'move', label: 'Move', icon: Move, proOnly: true },
  { id: 'select', label: 'Select', icon: BoxSelect, proOnly: true },
  { id: 'filter', label: 'Filters', icon: BlendIcon, proOnly: true },
];
// Pro: the Photoshop-style vertical toolbar (icon + shortcut letter).
function HealIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)" />
      <path d="M10.5 10.5h.01M13.5 13.5h.01M10.5 13.5h.01M13.5 10.5h.01" />
    </svg>
  );
}
type ProTool = { label: string; key: string; icon: any; tool: Tool; retouch?: RetouchKind; subject?: boolean };
const PRO_TOOLBAR: (ProTool | null)[] = [
  { label: 'Move', key: 'V', icon: Move, tool: 'move' },
  { label: 'Marquee', key: 'M', icon: BoxSelect, tool: 'select' },
  { label: 'Select subject', key: 'W', icon: Sparkles, tool: 'select', subject: true },
  { label: 'Crop', key: 'C', icon: CropIcon, tool: 'crop' },
  { label: 'Eyedropper', key: 'I', icon: Pipette, tool: 'eyedropper' },
  null,
  { label: 'Healing brush', key: 'J', icon: HealIcon, tool: 'retouch', retouch: 'heal' },
  { label: 'Brush', key: 'B', icon: Brush, tool: 'retouch', retouch: 'paint' },
  { label: 'Eraser', key: 'E', icon: Eraser, tool: 'retouch', retouch: 'erase' },
  { label: 'Gradient', key: 'G', icon: BlendIcon, tool: 'gradient' },
  { label: 'Paint bucket', key: 'K', icon: PaintBucket, tool: 'bucket' },
  { label: 'Blur', key: 'R', icon: Droplet, tool: 'retouch', retouch: 'blur' },
  { label: 'Dodge', key: 'O', icon: Sun, tool: 'retouch', retouch: 'dodge' },
  null,
  { label: 'Type', key: 'T', icon: TypeIcon, tool: 'text' },
  { label: 'Shape', key: 'U', icon: Square, tool: 'shape' },
  { label: 'Hand', key: 'H', icon: Hand, tool: 'hand' },
  { label: 'Zoom', key: 'Z', icon: ZoomIn, tool: 'zoom' },
];
const DOCK_TABS: { id: Tool | 'props'; label: string }[] = [
  { id: 'props', label: 'Properties' },
  { id: 'adjust', label: 'Adjust' },
  { id: 'color', label: 'Colour' },
  { id: 'filter', label: 'Filters' },
  { id: 'looks', label: 'Looks' },
];
// Pro shows the Photoshop-style tools first.
const PRO_ORDER: Tool[] = ['move', 'select', 'crop', 'retouch', 'adjust', 'color', 'filter', 'looks', 'bg', 'resize', 'export'];

// iPad / iPhone Safari can't keep canvases larger than ~16.7 megapixels and
// has a small total canvas memory, so phones and tablets work on a smaller copy.
const IS_TOUCH_DEVICE = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));
const MAX_PIXELS = IS_TOUCH_DEVICE ? 16_000_000 : 48_000_000;
const HISTORY_BYTES = IS_TOUCH_DEVICE ? 160_000_000 : 400_000_000;
function loadSource(src: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const px = img.naturalWidth * img.naturalHeight;
      const k = px > MAX_PIXELS ? Math.sqrt(MAX_PIXELS / px) : 1;
      const c = makeCanvas(img.naturalWidth * k, img.naturalHeight * k);
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c);
    };
    img.onerror = () => reject(new Error('This picture could not be opened.'));
    img.src = src;
  });
}

// ---------------------------------------------------------------- UI bits

function Range({ def, value, onChange, onCommit }: { def: SliderDef; value: number; onChange: (v: number) => void; onCommit: () => void }) {
  const bipolar = def.min < 0;
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  const zero = bipolar ? 50 : 0;
  return (
    <label className="block select-none" onDoubleClick={() => { onChange(0); onCommit(); }} title="Double-click to reset">
      <span className="flex items-center justify-between text-[12px] mb-1">
        <span className="text-mt-muted">{def.label}</span>
        <span className={cx('tabular-nums', value ? 'text-mt-ink font-medium' : 'text-mt-faint')}>{value > 0 && bipolar ? `+${value}` : value}</span>
      </span>
      <span className="relative block h-5">
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-mt-surface2" />
        <span className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full mt-spectrum" style={{ left: `${Math.min(zero, pct)}%`, width: `${Math.abs(pct - zero)}%` }} />
        <input
          type="range"
          min={def.min}
          max={def.max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
          onTouchEnd={onCommit}
          className="mt-range absolute inset-0 w-full opacity-100 bg-transparent appearance-none cursor-pointer"
          aria-label={def.label}
          data-live
        />
      </span>
    </label>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="py-4 border-b border-mt-border last:border-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-faint">{title}</h3>
        {action}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

const chip = (on: boolean) =>
  cx('h-8 px-3 rounded-full text-[12px] font-medium border transition-colors', on ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-ink hover:bg-mt-surface2');
const btnPrimary = 'h-10 px-4 rounded-xl bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40';
const btnGhost = 'h-10 px-4 rounded-xl border border-mt-border text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:bg-mt-surface2 disabled:opacity-40';
const iconBtn = 'h-9 w-9 rounded-lg inline-flex items-center justify-center text-mt-ink hover:bg-mt-surface2 disabled:opacity-30';
const field = 'h-9 w-full rounded-lg border border-mt-input-border bg-mt-surface px-2.5 text-[13px] text-mt-ink tabular-nums focus:outline-none focus:border-[#3B82C4]';

// ================================================================ editor

export const PhotoStudio = forwardRef<PhotoStudioHandle, PhotoStudioProps>(function PhotoStudio(props, ref) {
  const { source, embedded, onApply, onCancel, onDpiChange, onDirtyChange, onHistoryChange, headerLeft, headerRight } = props;
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ list: Snapshot[]; index: number }>({ list: [], index: -1 });
  const snap = history.list[history.index] as Snapshot | undefined;
  const layers = snap?.layers || null;
  const activeIdx = snap ? Math.min(snap.active, snap.layers.length - 1) : 0;
  // The selected layer's pixels: every pixel tool works on these.
  const target = layers ? layers[activeIdx].canvas : null;
  // The flattened picture: what is shown, exported and applied.
  const base = useMemo(() => (layers ? (isPlain(layers) ? layers[0].canvas : composite(layers)) : null), [layers]);
  const [sel, setSel] = useState<Selection | null>(null);
  const [adjust, setAdjust] = useState<Adjust>(NO_ADJUST);
  const [dpi, setDpi] = useState(props.dpi || 300);
  const [tool, setTool] = useState<Tool>('adjust');
  const [mode, setModeState] = useState<Mode>('simple');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mt:photoMode');
      // Desktop screens start in Pro (the full workspace) until the person picks.
      if (saved === 'pro' || (!saved && window.innerWidth >= 1100)) setModeState('pro');
    } catch {
      // not critical
    }
  }, []);
  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem('mt:photoMode', m);
    } catch {
      // not critical
    }
    if (m === 'simple' && tool === 'color') setTool('adjust');
  };
  const pro = mode === 'pro';
  // True while a slider or curve point is being dragged: draw from the draft copy.
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [proof, setProof] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = fit
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });
  const stageRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const draftRef = useRef<HTMLCanvasElement>(null);
  const firstPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // ---------------- history
  const push = useCallback((s: SnapPatch) => {
    setHistory((h) => {
      const cur = h.list[h.index];
      let ls = s.layers || cur.layers;
      const act = Math.min(s.active ?? cur.active, ls.length - 1);
      if (s.base) ls = ls.map((l, i) => (i === act ? { ...l, canvas: s.base! } : l));
      const next: Snapshot = { layers: ls, active: act, adjust: s.adjust || cur.adjust, dpi: s.dpi ?? cur.dpi, label: s.label };
      // Keep memory in check for big photos.
      const px = ls[0].canvas.width * ls[0].canvas.height * ls.length;
      const cap = Math.max(IS_TOUCH_DEVICE ? 3 : 6, Math.min(MAX_HISTORY, Math.floor(HISTORY_BYTES / Math.max(1, px * 4))));
      const list = [...h.list.slice(0, h.index + 1), next].slice(-cap);
      releaseDropped(h.list, list);
      return { list, index: list.length - 1 };
    });
  }, []);
  // Give memory back right away for steps that fell out of the history
  // (Safari otherwise keeps it until much later, and the page slows down).
  const releaseDropped = (before: Snapshot[], after: Snapshot[]) => {
    const keep = new Set<HTMLCanvasElement>();
    after.forEach((sn) => sn.layers.forEach((l) => keep.add(l.canvas)));
    if (firstPreviewRef.current) keep.add(firstPreviewRef.current);
    const drop: HTMLCanvasElement[] = [];
    before.forEach((sn) => sn.layers.forEach((l) => { if (!keep.has(l.canvas)) drop.push(l.canvas); }));
    if (drop.length) setTimeout(() => drop.forEach((c) => { c.width = 0; c.height = 0; }), 1500);
  };
  const undo = () => setHistory((h) => (h.index > 0 ? { ...h, index: h.index - 1 } : h));
  const redo = () => setHistory((h) => (h.index < h.list.length - 1 ? { ...h, index: h.index + 1 } : h));
  // Keep the live controls in step with the history position.
  useEffect(() => {
    if (!snap) return;
    setAdjust(snap.adjust);
    setDpi(snap.dpi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.index, history.list]);
  useEffect(() => onDpiChange?.(dpi), [dpi, onDpiChange]);
  useEffect(() => onDirtyChange?.(history.index > 0), [history.index, onDirtyChange]);
  useEffect(() => onHistoryChange?.(history.index > 0, history.index < history.list.length - 1), [history.index, history.list.length, onHistoryChange]);

  // ---------------- load
  useEffect(() => {
    let cancelled = false;
    setError(null);
    loadSource(source)
      .then((c) => {
        if (cancelled) return;
        firstPreviewRef.current = null;
        setHistory({ list: [{ layers: [makeLayer(c, 'Background')], active: 0, adjust: NO_ADJUST, dpi: props.dpi || 300, label: 'Open' }], index: 0 });
        setSel(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // ---------------- preview copy of the pixels
  const preview = useMemo(() => {
    if (!base) return null;
    const k = Math.min(1, PREVIEW_MAX / Math.max(base.width, base.height));
    const c = k < 1 ? resample(base, base.width * k, base.height * k) : base;
    const data = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
    if (!firstPreviewRef.current) firstPreviewRef.current = c;
    return { canvas: c, data, k, owner: {} };
  }, [base]);
  // Small draft copy used while dragging, so sliders follow instantly.
  const draft = useMemo(() => {
    if (!preview) return null;
    const long = Math.max(preview.canvas.width, preview.canvas.height);
    const target = 900;
    if (long <= target * 1.25) return null;
    const k = target / long;
    const c = resample(preview.canvas, preview.canvas.width * k, preview.canvas.height * k);
    return { canvas: c, data: c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height), owner: {} };
  }, [preview]);

  // ---------------- stage size
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setStageSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // ---------------- crop state
  const [cropAngle, setCropAngle] = useState(0); // degrees
  const [ratioId, setRatioId] = useState('free');
  const [box, setBox] = useState<CropBox | null>(null);
  const [exact, setExact] = useState<{ w: string; h: string; unit: PhysUnit; dpi: string } | null>(null);
  const exactPx = useMemo(() => {
    if (!exact) return null;
    const d = Math.max(1, parseFloat(exact.dpi) || 300);
    const w = Math.round(toPx(parseFloat(exact.w) || 0, exact.unit, d));
    const h = Math.round(toPx(parseFloat(exact.h) || 0, exact.unit, d));
    return w > 0 && h > 0 ? { w, h, dpi: d } : null;
  }, [exact]);
  const ratio: number | null = useMemo(() => {
    if (exactPx) return exactPx.w / exactPx.h;
    const r = RATIOS.find((x) => x.id === ratioId)?.r;
    if (r === 'orig') return base ? base.width / base.height : null;
    return (r as number | null) ?? null;
  }, [ratioId, exactPx, base]);
  const bounds = useMemo<CropBox | null>(() => {
    if (!base) return null;
    if (!cropAngle) return { x: 0, y: 0, w: base.width, h: base.height };
    return inscribedRect(base.width, base.height, (cropAngle * Math.PI) / 180, base.width / base.height);
  }, [base, cropAngle]);
  const resetBox = useCallback(
    (r: number | null = ratio) => {
      if (!bounds) return;
      if (!r) return setBox({ ...bounds });
      let w = bounds.w, h = w / r;
      if (h > bounds.h) { h = bounds.h; w = h * r; }
      setBox({ x: bounds.x + (bounds.w - w) / 2, y: bounds.y + (bounds.h - h) / 2, w, h });
    },
    [bounds, ratio]
  );
  useEffect(() => {
    if (tool === 'crop') resetBox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, base, cropAngle, ratio]);

  // ---------------- view geometry
  const viewScale = useMemo(() => {
    if (!preview) return 1;
    const pad = 32;
    const fit = Math.min((stageSize.w - pad) / preview.canvas.width, (stageSize.h - pad) / preview.canvas.height);
    return Math.max(0.02, fit * zoom);
  }, [preview, stageSize, zoom]);
  // Base pixels → CSS pixels on screen
  const basePxToScreen = preview ? viewScale * preview.k : 1;

  // ---------------- render the preview
  const proofTable = useRef<Uint8Array | null>(null);
  useEffect(() => {
    if (proof && !proofTable.current) loadProofTable().then((t) => { proofTable.current = t; setProof((p) => p); setTick((n) => n + 1); }).catch(() => setNotice('Print preview could not load.'));
  }, [proof]);
  const [tick, setTick] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (!preview || !displayRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const d = displayRef.current;
      if (!d) return;
      const src = comparing && firstPreviewRef.current ? firstPreviewRef.current : preview.canvas;
      const ctx = d.getContext('2d')!;
      const ov = draftRef.current;
      if (dragging && draft && !comparing && !(tool === 'crop' && cropAngle) && ov) {
        // Fast path while dragging: adjust the small draft copy and show it
        // in a light overlay canvas stretched over the picture.
        const img = applyAdjust(draft.data, adjust, draft.owner);
        if (proof && proofTable.current) proofRgbaInPlace(img.data, proofTable.current);
        if (ov.width !== img.width || ov.height !== img.height) {
          ov.width = img.width;
          ov.height = img.height;
        }
        ov.getContext('2d')!.putImageData(img, 0, 0);
        ov.style.visibility = 'visible';
        return;
      }
      if (ov && !overlayHold.current) ov.style.visibility = 'hidden';
      let img: ImageData;
      if (comparing) img = src.getContext('2d')!.getImageData(0, 0, src.width, src.height);
      else img = isNeutral(adjust) ? new ImageData(new Uint8ClampedArray(preview.data.data), preview.data.width, preview.data.height) : applyAdjust(preview.data, adjust, preview.owner);
      if (proof && proofTable.current) proofRgbaInPlace(img.data, proofTable.current);
      if (!comparing) computeHistogram(img);
      d.width = img.width;
      d.height = img.height;
      if (tool === 'crop' && cropAngle) {
        const tmp = makeCanvas(img.width, img.height);
        tmp.getContext('2d')!.putImageData(img, 0, 0);
        ctx.clearRect(0, 0, d.width, d.height);
        ctx.save();
        ctx.translate(d.width / 2, d.height / 2);
        ctx.rotate((cropAngle * Math.PI) / 180);
        ctx.drawImage(tmp, -d.width / 2, -d.height / 2);
        ctx.restore();
      } else ctx.putImageData(img, 0, 0);
    });
  }, [preview, draft, dragging, adjust, comparing, proof, tool, cropAngle, tick]);

  // ---------------- histogram (Pro)
  const histData = useRef<Uint32Array[] | null>(null);
  const histCanvas = useRef<HTMLCanvasElement | null>(null);
  const drawHistogram = useCallback(() => {
    const c = histCanvas.current, h = histData.current;
    if (!c || !h) return;
    const W = (c.width = 256), H = (c.height = 80);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    let max = 1;
    h.forEach((ch) => { for (let i = 2; i < 254; i++) max = Math.max(max, ch[i]); });
    const cols = ['rgba(239,68,68,0.55)', 'rgba(34,197,94,0.55)', 'rgba(59,130,246,0.55)'];
    ctx.globalCompositeOperation = 'screen';
    h.forEach((ch, k) => {
      ctx.fillStyle = cols[k];
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let i = 0; i < 256; i++) ctx.lineTo(i, H - Math.min(H, (Math.sqrt(ch[i]) / Math.sqrt(max)) * H));
      ctx.lineTo(255, H);
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }, []);
  const computeHistogram = (img: ImageData) => {
    const h = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    const d = img.data;
    const step = Math.max(1, Math.floor((img.width * img.height) / 120000)) * 4;
    for (let p = 0; p < d.length; p += step) {
      if (d[p + 3] < 16) continue;
      h[0][d[p]]++; h[1][d[p + 1]]++; h[2][d[p + 2]]++;
    }
    histData.current = h;
    drawHistogram();
  };
  const histRef = useCallback((el: HTMLCanvasElement | null) => {
    histCanvas.current = el;
    drawHistogram();
  }, [drawHistogram]);

  // ---------------- actions
  const commitAdjust = (a: Adjust = adjust, label = 'Adjust') => {
    if (!snap) return;
    if (JSON.stringify(a) === JSON.stringify(snap.adjust)) return;
    push({ adjust: a, label });
  };
  const setOne = (k: keyof Adjust, v: number) => setAdjust((a) => ({ ...a, [k]: v }));
  const runAuto = () => {
    if (!preview) return;
    const a = { ...adjust, ...autoEnhance(preview.data) };
    setAdjust(a);
    commitAdjust(a, 'Auto enhance');
  };
  const setArr = (k: 'hsl' | 'grade', i: number, v: number) => setAdjust((a) => { const arr = [...a[k]]; arr[i] = v; return { ...a, [k]: arr }; });
  const commitLive = () => setTimeout(() => setAdjust((a) => { commitAdjust(a); return a; }), 0);

  const run = async (label: string, fn: () => HTMLCanvasElement | Promise<HTMLCanvasElement>, extra: Partial<SnapPatch> = {}) => {
    setBusy(label);
    await new Promise((r) => setTimeout(r, 30));
    try {
      const out = await fn();
      push({ base: out, label, ...extra });
    } catch (e) {
      console.error(e);
      setNotice(`${label} didn’t work on this picture. Please try again.`);
    } finally {
      setBusy(null);
    }
  };

  // Geometry edits (crop, rotate, flip, resize) change every layer together.
  const runAll = async (label: string, fn: (c: HTMLCanvasElement) => HTMLCanvasElement, extra: Partial<SnapPatch> = {}) => {
    if (!layers) return;
    setBusy(label);
    await new Promise((r) => setTimeout(r, 30));
    try {
      push({ label, ...extra, layers: layers.map((l) => ({ ...l, canvas: fn(l.canvas) })) });
      setSel(null);
    } catch (e) {
      console.error(e);
      setNotice(`${label} didn’t work on this picture. Please try again.`);
    } finally {
      setBusy(null);
    }
  };

  const applyCrop = () => {
    if (!base || !box) return;
    const outW = exactPx ? exactPx.w : Math.round(box.w);
    const outH = exactPx ? exactPx.h : Math.round(box.h);
    runAll('Crop', (c) => cropTo(c, box, (cropAngle * Math.PI) / 180, outW, outH), exactPx ? { dpi: exactPx.dpi } : {}).then(() => {
      setCropAngle(0);
    });
  };

  const renderResult = useCallback((): HTMLCanvasElement | null => {
    if (!base) return null;
    return renderAdjusted(base, adjust);
  }, [base, adjust]);

  const doApply = async () => {
    if (!onApply) return;
    setBusy('Applying');
    await new Promise((r) => setTimeout(r, 30));
    try {
      const out = renderResult();
      if (out) await onApply(out.toDataURL('image/png'));
    } finally {
      setBusy(null);
    }
  };

  useImperativeHandle(ref, () => ({
    renderResult,
    getDpi: () => dpi,
    applyNow: () => {
      if (!base || !onApply) return false;
      const out = renderResult();
      if (!out) return false;
      onApply(out.toDataURL('image/png'));
      return true;
    },
    undo,
    redo,
  }));

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (e.key === '\\') setComparing(true);
      else if (tool === 'crop' && e.key === 'Enter') applyCrop();
      else if (tool === 'filter' && e.key === 'Enter') applyFilterNow();
      else if (pro) {
        const k = e.key.toLowerCase();
        if (mod && k === 'j') { e.preventDefault(); selOps.toLayer(); }
        else if (mod && e.shiftKey && k === 'i') { e.preventDefault(); selOps.invert(); }
        else if (mod && k === 'a') { e.preventDefault(); selOps.all(); }
        else if (mod && k === 'd') { e.preventDefault(); selOps.none(); }
        else if (mod && k === 'e' && !e.shiftKey) { e.preventDefault(); layerOps.mergeDown(); }
        else if (mod && e.shiftKey && k === 'n') { e.preventDefault(); layerOps.add(); }
        else if (mod && k === 'l') { e.preventDefault(); setTool('color'); }
        else if (mod && k === 'o' && !embedded) { e.preventDefault(); fileRef.current?.click(); }
        else if (mod && k === ']') { e.preventDefault(); layerOps.move(1); }
        else if (mod && k === '[') { e.preventDefault(); layerOps.move(-1); }
        else if (mod && (k === '=' || k === '+')) { e.preventDefault(); setZoom((z) => Math.min(8, z * 1.25)); }
        else if (mod && k === '-') { e.preventDefault(); setZoom((z) => Math.max(0.5, z / 1.25)); }
        else if (mod && k === '0') { e.preventDefault(); setZoom(1); setPan({ x: 0, y: 0 }); }
        else if ((k === 'delete' || k === 'backspace') && sel) { e.preventDefault(); selOps.clear(); }
        else if (k === 'escape' && sel) setSel(null);
        else if (!mod && !e.altKey) {
          if (k === 'v') setTool('move');
          else if (k === 'm') setTool('select');
          else if (k === 'c') setTool('crop');
          else if (k === 'b') { setRetouch('paint'); setTool('retouch'); }
          else if (k === 'e') { setRetouch('erase'); setTool('retouch'); }
          else if (k === 'j') { setRetouch('heal'); setTool('retouch'); }
          else if (k === 'i') setTool('eyedropper');
          else if (k === 'w') { setTool('select'); selOps.subject(); }
          else if (k === 'r') { setRetouch('blur'); setTool('retouch'); }
          else if (k === 'o') { setRetouch('dodge'); setTool('retouch'); }
          else if (k === 't') setTool('text');
          else if (k === 'g') setTool('gradient');
          else if (k === 'u') setTool('shape');
          else if (k === 'k') setTool('bucket');
          else if (k === 'h') setTool('hand');
          else if (k === 'z') setTool('zoom');
          else if (k === 'x') { const f = paintColor; setPaintColor(bgColor); setBgColor(f); }
          else if (k === 'd') { setPaintColor('#000000'); setBgColor('#FFFFFF'); }
          else if (k === '[') setHealSize((v) => Math.max(8, v - 8));
          else if (k === ']') setHealSize((v) => Math.min(240, v + 8));
        }
      }
    };
    const onUp = (e: KeyboardEvent) => e.key === '\\' && setComparing(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
    };
  });

  // ---------------- stage pointer handling (pan / pinch / crop / heal)
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<any>(null);
  const [healSize, setHealSize] = useState(40); // brush size, screen px
  const [healPts, setHealPts] = useState<{ x: number; y: number }[]>([]);
  const [retouch, setRetouch] = useState<RetouchKind>('heal');
  const [brushStrength, setBrushStrength] = useState(50);
  const [brushHardness, setBrushHardness] = useState(30);
  const strokeRef = useRef<{ work: ImageData; stroke: ReturnType<typeof createStroke>; pts: { x: number; y: number }[]; radius: number } | null>(null);
  const brushCursor = useRef<HTMLDivElement>(null);
  const brushOpts = (radius: number) => ({ radius, strength: brushStrength / 100, hardness: brushHardness / 100 });
  const [paintColor, setPaintColor] = useState('#E11D48');
  const isPaint = retouch === 'paint' || retouch === 'erase';
  const strokeLike = retouch === 'heal' || isPaint;
  // Pro: selection shape tool, live marquee, filter and overlay state.
  const [selKind, setSelKind] = useState<'rect' | 'ellipse'>('rect');
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const overlayHold = useRef(false);
  const overlayScale = (w: number, h: number) => Math.min(1, 1000 / Math.max(w, h));
  const showOverlay = (c: HTMLCanvasElement) => {
    const ov = draftRef.current;
    if (!ov) return;
    if (ov.width !== c.width || ov.height !== c.height) { ov.width = c.width; ov.height = c.height; }
    const ctx = ov.getContext('2d')!;
    ctx.clearRect(0, 0, ov.width, ov.height);
    ctx.drawImage(c, 0, 0);
    ov.style.visibility = 'visible';
    overlayHold.current = true;
  };
  const hideOverlay = () => {
    overlayHold.current = false;
    if (draftRef.current) draftRef.current.style.visibility = 'hidden';
  };
  // Shows the painted area live, with the current adjustments on top.
  const paintRegion = (r: { x0: number; y0: number; x1: number; y1: number }) => {
    const st = strokeRef.current, d = displayRef.current;
    if (!st || !d || !preview) return;
    const m = 4;
    const x0 = Math.max(0, Math.floor(r.x0 - m)), y0 = Math.max(0, Math.floor(r.y0 - m));
    const x1 = Math.min(st.work.width, Math.ceil(r.x1 + m)), y1 = Math.min(st.work.height, Math.ceil(r.y1 + m));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const reg = new ImageData(w, h);
    for (let y = 0; y < h; y++) reg.data.set(st.work.data.subarray(((y0 + y) * st.work.width + x0) * 4, ((y0 + y) * st.work.width + x1) * 4), y * w * 4);
    const out = isNeutral(adjust) ? reg : applyAdjust(reg, { ...adjust, vignette: 0, grain: 0 }, {});
    if (proof && proofTable.current) proofRgbaInPlace(out.data, proofTable.current);
    d.getContext('2d')!.putImageData(out, x0, y0);
  };
  const imgRect = () => displayRef.current?.getBoundingClientRect();
  const toBase = (clientX: number, clientY: number) => {
    const r = imgRect();
    if (!r || !base) return { x: 0, y: 0 };
    return { x: ((clientX - r.left) / r.width) * base.width, y: ((clientY - r.top) / r.height) * base.height };
  };

  const onStageDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      setHealPts([]);
      return;
    }
    const target = e.target as HTMLElement;
    const handle = target.dataset?.handle;
    if (tool === 'crop' && box && handle) {
      gesture.current = { kind: 'crop', handle, start: toBase(e.clientX, e.clientY), box: { ...box } };
      return;
    }
    if (tool === 'move' && layers && target) {
      gesture.current = { kind: 'move', start: toBase(e.clientX, e.clientY), dx: 0, dy: 0 };
      return;
    }
    if (tool === 'eyedropper') { pickColorAt(e.clientX, e.clientY); gesture.current = { kind: 'eyedropper' }; return; }
    if (tool === 'zoom') {
      const out = e.altKey;
      setZoom((z) => Math.min(8, Math.max(0.5, out ? z / 1.5 : z * 1.5)));
      gesture.current = null;
      return;
    }
    if (tool === 'text' && base) {
      e.preventDefault(); // keep focus in the text box that is about to open
      if (textDraft) { commitText(); return; }
      const p = toBase(e.clientX, e.clientY);
      setTextDraft({ x: p.x, y: p.y, value: '' });
      gesture.current = null;
      return;
    }
    if (tool === 'bucket' && base) {
      const p = toBase(e.clientX, e.clientY);
      gesture.current = null;
      bucketFill(p.x, p.y);
      return;
    }
    if (tool === 'shape' && base) {
      const p = toBase(e.clientX, e.clientY);
      gesture.current = { kind: 'shape' };
      setShapeDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      return;
    }
    if (tool === 'gradient' && base) {
      const p = toBase(e.clientX, e.clientY);
      gesture.current = { kind: 'gradient' };
      setGradDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      return;
    }
    if (tool === 'select' && base) {
      const p = toBase(e.clientX, e.clientY);
      gesture.current = { kind: 'marquee', start: p };
      setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
      return;
    }
    if (tool === 'retouch' && base && strokeLike) {
      gesture.current = { kind: 'heal' };
      setHealPts([toBase(e.clientX, e.clientY)]);
      return;
    }
    if (tool === 'retouch' && base && preview) {
      gesture.current = { kind: 'brush' };
      const work = new ImageData(new Uint8ClampedArray(preview.data.data), preview.data.width, preview.data.height);
      const radius = healSize / 2 / viewScale; // preview pixels
      const stroke = createStroke(work, retouch as BrushKind, brushOpts(radius));
      const b = toBase(e.clientX, e.clientY);
      const p = { x: b.x * preview.k, y: b.y * preview.k };
      strokeRef.current = { work, stroke, pts: [p], radius };
      const r = stroke.to(p.x, p.y);
      if (r) paintRegion(r);
      return;
    }
    gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, pan: { ...pan } };
  };
  const onStageMove = (e: React.PointerEvent) => {
    if (statusRef.current && base) {
      const p = toBase(e.clientX, e.clientY);
      statusRef.current.textContent = p.x >= 0 && p.y >= 0 && p.x <= base.width && p.y <= base.height ? `X ${Math.round(p.x)}  Y ${Math.round(p.y)}` : '';
    }
    if (brushCursor.current) {
      const st = stageRef.current!.getBoundingClientRect();
      brushCursor.current.style.transform = `translate(${e.clientX - st.left - healSize / 2}px, ${e.clientY - st.top - healSize / 2}px)`;
    }
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(Math.min(8, Math.max(0.5, (g.zoom * d) / g.dist)));
    } else if (g.kind === 'pan') {
      setPan({ x: g.pan.x + e.clientX - g.sx, y: g.pan.y + e.clientY - g.sy });
    } else if (g.kind === 'heal') {
      const p = toBase(e.clientX, e.clientY);
      setHealPts((pts) => [...pts, p]);
    } else if (g.kind === 'eyedropper') {
      pickColorAt(e.clientX, e.clientY);
    } else if (g.kind === 'gradient') {
      const p = toBase(e.clientX, e.clientY);
      setGradDrag((d) => (d ? { ...d, x1: p.x, y1: p.y } : d));
    } else if (g.kind === 'shape') {
      const p = toBase(e.clientX, e.clientY);
      setShapeDrag((d) => {
        if (!d) return d;
        let x1 = p.x, y1 = p.y;
        if (e.shiftKey && shapeOpts.kind !== 'line') { const m = Math.max(Math.abs(x1 - d.x0), Math.abs(y1 - d.y0)); x1 = d.x0 + Math.sign(x1 - d.x0 || 1) * m; y1 = d.y0 + Math.sign(y1 - d.y0 || 1) * m; }
        return { ...d, x1, y1 };
      });
    } else if (g.kind === 'move' && layers && target) {
      const p = toBase(e.clientX, e.clientY);
      g.dx = p.x - g.start.x;
      g.dy = p.y - g.start.y;
      const k = overlayScale(target.width, target.height);
      showOverlay(composite(layers, k, { index: activeIdx, canvas: target, dx: g.dx, dy: g.dy }));
    } else if (g.kind === 'marquee' && base) {
      const p = toBase(e.clientX, e.clientY);
      let w = p.x - g.start.x, h = p.y - g.start.y;
      if (e.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
      const x = Math.max(0, Math.min(g.start.x, g.start.x + w)), y = Math.max(0, Math.min(g.start.y, g.start.y + h));
      setMarquee({ x, y, w: Math.min(base.width, Math.max(g.start.x, g.start.x + w)) - x, h: Math.min(base.height, Math.max(g.start.y, g.start.y + h)) - y });
    } else if (g.kind === 'brush' && strokeRef.current && preview) {
      const b = toBase(e.clientX, e.clientY);
      const p = { x: b.x * preview.k, y: b.y * preview.k };
      strokeRef.current.pts.push(p);
      const r = strokeRef.current.stroke.to(p.x, p.y);
      if (r) paintRegion(r);
    } else if (g.kind === 'crop' && bounds) {
      const p = toBase(e.clientX, e.clientY);
      const dx = p.x - g.start.x, dy = p.y - g.start.y;
      const b0: CropBox = g.box;
      let { x, y, w, h } = b0;
      const minS = Math.max(8, Math.min(base!.width, base!.height) * 0.02);
      const hd: string = g.handle;
      if (hd === 'move') {
        x = Math.min(Math.max(bounds.x, b0.x + dx), bounds.x + bounds.w - w);
        y = Math.min(Math.max(bounds.y, b0.y + dy), bounds.y + bounds.h - h);
      } else {
        let L = b0.x, T = b0.y, Rr = b0.x + b0.w, B = b0.y + b0.h;
        if (hd.includes('l')) L = Math.min(Rr - minS, Math.max(bounds.x, L + dx));
        if (hd.includes('r')) Rr = Math.max(L + minS, Math.min(bounds.x + bounds.w, Rr + dx));
        if (hd.includes('t')) T = Math.min(B - minS, Math.max(bounds.y, T + dy));
        if (hd.includes('b')) B = Math.max(T + minS, Math.min(bounds.y + bounds.h, B + dy));
        w = Rr - L; h = B - T; x = L; y = T;
        if (ratio) {
          // Keep the shape: size from the width, anchored to the opposite corner.
          let nw = w, nh = nw / ratio;
          if (hd === 't' || hd === 'b') { nh = h; nw = nh * ratio; }
          const maxW = hd.includes('l') ? b0.x + b0.w - bounds.x : hd.includes('r') ? bounds.x + bounds.w - b0.x : bounds.w;
          const maxH = hd.includes('t') ? b0.y + b0.h - bounds.y : hd.includes('b') ? bounds.y + bounds.h - b0.y : bounds.h;
          const k = Math.min(1, maxW / nw, maxH / nh);
          nw *= k; nh *= k;
          x = hd.includes('l') ? b0.x + b0.w - nw : hd.includes('r') ? b0.x : b0.x + (b0.w - nw) / 2;
          y = hd.includes('t') ? b0.y + b0.h - nh : hd.includes('b') ? b0.y : b0.y + (b0.h - nh) / 2;
          w = nw; h = nh;
          x = Math.min(Math.max(bounds.x, x), bounds.x + bounds.w - w);
          y = Math.min(Math.max(bounds.y, y), bounds.y + bounds.h - h);
        }
      }
      setBox({ x, y, w, h });
    }
  };
  const onStageUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) gesture.current = null;
    if (g?.kind === 'heal' && base && healPts.length) {
      const r = healSize / 2 / basePxToScreen;
      const pts = healPts;
      setHealPts([]);
      if (isPaint) {
        run(retouch === 'erase' ? 'Erase' : 'Paint', () => paintStroke(target!, pts, { size: r * 2, color: paintColor, opacity: brushStrength / 100, hardness: brushHardness / 100, erase: retouch === 'erase', mask: sel?.mask }));
      } else run('Heal', () => spotHeal(target!, pts, r));
    }
    if (g?.kind === 'shape' && shapeDrag) {
      const d = shapeDrag;
      setShapeDrag(null);
      if (Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 4) commitShape(d);
    }
    if (g?.kind === 'gradient' && gradDrag) {
      const d = gradDrag;
      setGradDrag(null);
      if (Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 4) applyGradient(d);
    }
    if (g?.kind === 'move') {
      const dx = Math.round(g.dx), dy = Math.round(g.dy);
      if ((dx || dy) && target) {
        const moved = translate(target, dx, dy);
        push({ base: moved, label: 'Move' });
      }
      setTimeout(hideOverlay, 60);
    }
    if (g?.kind === 'marquee' && base) {
      const m = marquee;
      setMarquee(null);
      if (m && m.w > 3 && m.h > 3) setSel({ mask: maskShape(base.width, base.height, selKind, m.x, m.y, m.w, m.h), shape: { kind: selKind, ...m } });
      else setSel(null);
    }
    if (g?.kind === 'brush' && base && preview && strokeRef.current) {
      const st = strokeRef.current;
      strokeRef.current = null;
      const kind = retouch as BrushKind;
      const label = RETOUCH.find((x) => x.id === kind)?.label || 'Retouch';
      if (preview.k === 1 && layers?.length === 1) {
        // The preview is the full picture: keep what was painted.
        const c = makeCanvas(st.work.width, st.work.height);
        c.getContext('2d')!.putImageData(st.work, 0, 0);
        push({ base: c, label });
      } else run(label, () => replayStroke(target!, kind, brushOpts(st.radius), st.pts, 1 / preview.k));
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!preview) return;
    const f = Math.exp(-e.deltaY * 0.0015);
    setZoom((z) => Math.min(8, Math.max(0.5, z * f)));
  };

  // ---------------- Pro: layers, selection, filters
  const setLayers = (ls: Layer[], active: number, label: string) => push({ layers: ls, active, label });
  const insertAbove = (layer: Layer, label: string) => {
    if (!layers) return;
    const ls = [...layers];
    ls.splice(activeIdx + 1, 0, layer);
    setLayers(ls, activeIdx + 1, label);
  };
  const layerOps = {
    select: (i: number) => layers && i !== activeIdx && setHistory((h) => {
      // Picking a layer isn't an edit: update the current snapshot in place.
      const list = [...h.list];
      list[h.index] = { ...list[h.index], active: i };
      return { ...h, list };
    }),
    add: () => target && insertAbove(makeLayer(blankLike(target), `Layer ${(layers?.length || 0) + 1}`), 'New layer'),
    duplicate: () => layers && insertAbove({ ...layers[activeIdx], id: makeLayer(target!, '').id, name: `${layers[activeIdx].name} copy` }, 'Duplicate layer'),
    remove: () => {
      if (!layers || layers.length < 2) return;
      setLayers(layers.filter((_, i) => i !== activeIdx), Math.max(0, activeIdx - 1), 'Delete layer');
    },
    move: (dir: 1 | -1) => {
      if (!layers) return;
      const j = activeIdx + dir;
      if (j < 0 || j >= layers.length) return;
      const ls = [...layers];
      [ls[activeIdx], ls[j]] = [ls[j], ls[activeIdx]];
      setLayers(ls, j, dir > 0 ? 'Move layer up' : 'Move layer down');
    },
    mergeDown: () => {
      if (!layers || activeIdx < 1) return;
      const ls = [...layers];
      ls.splice(activeIdx - 1, 2, mergeDown(layers[activeIdx - 1], layers[activeIdx]));
      setLayers(ls, activeIdx - 1, 'Merge down');
    },
    flatten: () => {
      if (!layers || layers.length < 2) return;
      setLayers([makeLayer(composite(layers), 'Background')], 0, 'Flatten');
    },
    patch: (i: number, p: Partial<Layer>, label: string) => {
      if (!layers) return;
      setLayers(layers.map((l, k) => (k === i ? { ...l, ...p } : l)), activeIdx, label);
    },
  };
  const selOps = {
    all: () => base && setSel({ mask: maskAll(base.width, base.height), shape: { kind: 'rect', x: 0, y: 0, w: base.width, h: base.height } }),
    none: () => setSel(null),
    invert: () => sel && setSel({ mask: invertMask(sel.mask), shape: sel.shape, inverted: !sel.inverted }),
    subject: () => { setBgMode('subject'); setBgOpen(true); },
    clear: () => sel && target && push({ base: clearMasked(target, sel.mask), label: 'Delete selection' }),
    fill: (color: string) => target && push({ base: fillMasked(target, sel?.mask || null, color), label: sel ? 'Fill selection' : 'Fill layer' }),
    toLayer: () => target && insertAbove(makeLayer(sel ? copyMasked(target, sel.mask) : target, sel ? 'Selection copy' : `${layers![activeIdx].name} copy`), 'Layer via copy'),
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const readFile = (file: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
  const openFile = async (file: File) => {
    try {
      const c = await loadSource(await readFile(file));
      firstPreviewRef.current = null;
      setHistory({ list: [{ layers: [makeLayer(c, 'Background')], active: 0, adjust: NO_ADJUST, dpi, label: 'Open' }], index: 0 });
      setSel(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } catch {
      setNotice('That file couldn’t be opened. Try a JPG, PNG or WebP.');
    }
  };
  const placeFile = async (file: File) => {
    if (!base) return;
    try {
      const c = await loadSource(await readFile(file));
      insertAbove(makeLayer(placeImage(c, base.width, base.height), file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Image'), 'Place image');
      setTool('move');
    } catch {
      setNotice('That picture couldn’t be added.');
    }
  };
  // Filters: live preview on a small copy, applied at full size.
  const [filterId, setFilterId] = useState<FilterId>('blur');
  const fdef = FILTERS.find((x) => x.id === filterId)!;
  const [filterAmt, setFilterAmt] = useState(fdef.amount?.def ?? 0);
  const [filterAngle, setFilterAngle] = useState(0);
  const pickFilter = (id: FilterId) => {
    setFilterId(id);
    setFilterAmt(FILTERS.find((x) => x.id === id)!.amount?.def ?? 0);
    setTool('filter');
  };
  useEffect(() => {
    if (tool !== 'filter' || !layers || !target) { if (overlayHold.current && tool !== 'move') hideOverlay(); return; }
    const t = setTimeout(() => {
      const k = overlayScale(target.width, target.height);
      const small = k < 1 ? resample(target, target.width * k, target.height * k) : target;
      let out = applyFilter(small, filterId, filterAmt, filterAngle, k);
      if (sel) out = blendMasked(small, out, k < 1 ? resample(sel.mask, small.width, small.height) : sel.mask);
      showOverlay(composite(layers, k, { index: activeIdx, canvas: out }));
    }, 90);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, filterId, filterAmt, filterAngle, layers, activeIdx, sel]);
  const applyFilterNow = () => {
    if (!target) return;
    const t0 = target, s0 = sel;
    run(fdef.label, () => {
      const out = applyFilter(t0, filterId, filterAmt, filterAngle, 1);
      return s0 ? blendMasked(t0, out, s0.mask) : out;
    }).then(() => setTool('adjust'));
  };
  // Dimmed view of what is NOT selected, so the selection is easy to see.
  const selOverlay = useMemo(() => {
    if (!sel || !preview) return null;
    const c = makeCanvas(preview.canvas.width, preview.canvas.height);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(15,23,42,0.45)';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(sel.mask, 0, 0, c.width, c.height);
    return c.toDataURL();
  }, [sel, preview]);
  const [showLayers, setShowLayers] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  // Pro dock: remembers the last on-picture tool so "Properties" can go back to it.
  const lastCanvasTool = useRef<Tool>('move');
  if (CANVAS_TOOLS.includes(tool)) lastCanvasTool.current = tool;
  // Pro: background colour (paint uses the foreground = paintColor), text and gradient tools.
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [textOpts, setTextOpts] = useState<{ font: string; size: number; bold: boolean; italic: boolean; align: 'left' | 'center' | 'right'; spacing: number; effect: TextEffect; fxColor: string }>({ font: 'Montserrat', size: 0, bold: true, italic: false, align: 'left', spacing: 0, effect: 'none', fxColor: '#09090B' });
  const [shapeOpts, setShapeOpts] = useState<{ kind: 'rect' | 'ellipse' | 'line'; fill: boolean; stroke: number; radius: number }>({ kind: 'rect', fill: true, stroke: 8, radius: 0 });
  const [shapeDrag, setShapeDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [bucketTol, setBucketTol] = useState(32);
  // Fonts for the Type tool come from the editor's library.
  const fontsInjected = useRef(false);
  useEffect(() => {
    if (!pro || fontsInjected.current || typeof document === 'undefined' || document.getElementById('mt-font-faces')) return;
    fontsInjected.current = true;
    const st = document.createElement('style');
    st.id = 'mt-font-faces';
    st.textContent = allFontFacesCSS();
    document.head.appendChild(st);
  }, [pro]);
  useEffect(() => {
    if (tool === 'text') ensureFontLoaded(textOpts.font, textOpts.bold ? 700 : 400, textOpts.italic).catch(() => {});
  }, [tool, textOpts.font, textOpts.bold, textOpts.italic]);
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null);
  const [gradKind, setGradKind] = useState<'linear' | 'radial'>('linear');
  const [gradDrag, setGradDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const textPx = textOpts.size || Math.max(12, Math.round((base?.width || 1000) * 0.06));
  const commitText = async () => {
    const d = textDraft;
    setTextDraft(null);
    if (!d || !d.value.trim() || !target) return;
    const o = textOpts;
    await ensureFontLoaded(o.font, o.bold ? 700 : 400, o.italic).catch(() => {});
    const c = blankLike(target);
    const ctx = c.getContext('2d')!;
    const px = textPx;
    ctx.textBaseline = 'top';
    ctx.font = `${o.italic ? 'italic ' : ''}${o.bold ? 700 : 400} ${px}px "${o.font}", sans-serif`;
    try { (ctx as any).letterSpacing = `${o.spacing}px`; } catch { /* older browsers */ }
    const lines = d.value.split('\n');
    const widths = lines.map((l) => ctx.measureText(l).width);
    const blockW = Math.max(...widths);
    // The click point is the left edge, centre or right edge of the block.
    const lineX = (i: number) => (o.align === 'left' ? d.x : o.align === 'center' ? d.x + (blockW - widths[i]) / 2 : d.x + blockW - widths[i]);
    const lineY = (i: number) => d.y + i * px * 1.2;
    const fx = o.fxColor;
    const fillAll = (dx = 0, dy = 0, style: string = paintColor) => {
      ctx.fillStyle = style;
      lines.forEach((l, i) => ctx.fillText(l, lineX(i) + dx, lineY(i) + dy));
    };
    const strokeAll = (w: number, style: string) => {
      ctx.lineWidth = w;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = style;
      lines.forEach((l, i) => ctx.strokeText(l, lineX(i), lineY(i)));
    };
    ctx.save();
    switch (o.effect) {
      case 'highlight':
        ctx.fillStyle = fx === '#09090B' ? '#F7C948' : fx;
        lines.forEach((l, i) => l.trim() && ctx.fillRect(lineX(i) - px * 0.15, lineY(i) - px * 0.05, widths[i] + px * 0.3, px * 1.15));
        fillAll();
        break;
      case 'shadow':
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = px * 0.12; ctx.shadowOffsetX = ctx.shadowOffsetY = px * 0.06;
        fillAll();
        break;
      case 'lift':
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = px * 0.3; ctx.shadowOffsetY = px * 0.1;
        fillAll();
        break;
      case 'glow':
        ctx.shadowColor = fx === '#09090B' ? '#8CCBFF' : fx; ctx.shadowBlur = px * 0.35;
        fillAll(); fillAll();
        break;
      case 'neon':
        ctx.shadowColor = fx === '#09090B' ? '#F2708F' : fx; ctx.shadowBlur = px * 0.4;
        fillAll(); fillAll();
        ctx.shadowBlur = 0;
        strokeAll(Math.max(1, px * 0.02), 'rgba(255,255,255,0.9)');
        break;
      case 'outline':
        strokeAll(Math.max(2, px * 0.1), fx);
        fillAll();
        break;
      case 'retro':
        fillAll(px * 0.07, px * 0.07, '#1A1A1A');
        strokeAll(Math.max(2, px * 0.09), fx === '#09090B' ? '#FFF4E0' : fx);
        fillAll();
        break;
      default:
        fillAll();
    }
    ctx.restore();
    insertAbove(makeLayer(c, `Text: ${d.value.slice(0, 24)}`), 'Add text');
  };
  const commitShape = (g: { x0: number; y0: number; x1: number; y1: number }) => {
    if (!target) return;
    const c = blankLike(target);
    const ctx = c.getContext('2d')!;
    const x = Math.min(g.x0, g.x1), y = Math.min(g.y0, g.y1), w = Math.abs(g.x1 - g.x0), h = Math.abs(g.y1 - g.y0);
    ctx.fillStyle = paintColor;
    ctx.strokeStyle = shapeOpts.fill ? bgColor : paintColor;
    ctx.lineWidth = shapeOpts.stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (shapeOpts.kind === 'line') {
      ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x1, g.y1);
      ctx.strokeStyle = paintColor; ctx.lineWidth = Math.max(1, shapeOpts.stroke);
      ctx.stroke();
    } else {
      if (shapeOpts.kind === 'ellipse') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      else {
        const r = Math.min(shapeOpts.radius, w / 2, h / 2);
        ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      }
      if (shapeOpts.fill) ctx.fill();
      if (!shapeOpts.fill || shapeOpts.stroke > 0) { if (!shapeOpts.fill || shapeOpts.stroke) ctx.stroke(); }
    }
    insertAbove(makeLayer(c, shapeOpts.kind === 'line' ? 'Line' : shapeOpts.kind === 'ellipse' ? 'Ellipse' : 'Rectangle'), 'Add shape');
  };
  // Paint bucket: fills the touching area of similar colour (inside the
  // selection, if there is one) on the selected layer.
  const bucketFill = (px: number, py: number) => {
    if (!target) return;
    const t0 = target, s0 = sel, col = paintColor, tol = bucketTol;
    run('Paint bucket', () => {
      const W = t0.width, H = t0.height;
      const x0 = Math.floor(px), y0 = Math.floor(py);
      const out = makeCanvas(W, H);
      const octx = out.getContext('2d', { willReadFrequently: true })!;
      octx.drawImage(t0, 0, 0);
      if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return out;
      const img = octx.getImageData(0, 0, W, H);
      const d = img.data;
      const mask = s0 ? s0.mask.getContext('2d')!.getImageData(0, 0, W, H).data : null;
      const i0 = (y0 * W + x0) * 4;
      const r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2], a0 = d[i0 + 3];
      const v = parseInt(col.slice(1), 16), R = (v >> 16) & 255, G = (v >> 8) & 255, B = v & 255;
      const t = tol * 3;
      const seen = new Uint8Array(W * H);
      const match = (p: number) => {
        const i = p * 4;
        if (mask && mask[i + 3] < 128) return false;
        return Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0) + Math.abs(d[i + 3] - a0) <= t;
      };
      const stack = [y0 * W + x0];
      while (stack.length) {
        const p = stack.pop()!;
        if (seen[p]) continue;
        let x = p % W; const y = (p - x) / W;
        // scan left and right on this row
        let l = x; while (l > 0 && !seen[y * W + l - 1] && match(y * W + l - 1)) l--;
        let r = x; while (r < W - 1 && !seen[y * W + r + 1] && match(y * W + r + 1)) r++;
        if (!match(p)) { seen[p] = 1; continue; }
        for (x = l; x <= r; x++) {
          const q = y * W + x;
          seen[q] = 1;
          const i = q * 4;
          d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255;
          if (y > 0 && !seen[q - W] && match(q - W)) stack.push(q - W);
          if (y < H - 1 && !seen[q + W] && match(q + W)) stack.push(q + W);
        }
      }
      octx.putImageData(img, 0, 0);
      return out;
    });
  };
  // Layer styles (Photoshop's fx): baked into the selected layer.
  const layerStyle = (kind: 'shadow' | 'glow' | 'stroke') => {
    if (!target) return;
    const t0 = target, col = paintColor;
    run(kind === 'shadow' ? 'Drop shadow' : kind === 'glow' ? 'Outer glow' : 'Stroke', () => {
      const W = t0.width, H = t0.height, size = Math.max(4, Math.round(Math.max(W, H) * 0.012));
      const out = makeCanvas(W, H);
      const ctx = out.getContext('2d')!;
      // Silhouette of the layer in one colour.
      const sil = makeCanvas(W, H);
      const sctx = sil.getContext('2d')!;
      sctx.drawImage(t0, 0, 0);
      sctx.globalCompositeOperation = 'source-in';
      sctx.fillStyle = kind === 'shadow' ? '#000000' : col;
      sctx.fillRect(0, 0, W, H);
      if (kind === 'stroke') {
        for (let a = 0; a < 24; a++) ctx.drawImage(sil, Math.cos((a / 24) * Math.PI * 2) * size, Math.sin((a / 24) * Math.PI * 2) * size);
      } else {
        ctx.save();
        ctx.filter = `blur(${kind === 'shadow' ? size : size * 1.6}px)`;
        ctx.globalAlpha = kind === 'shadow' ? 0.55 : 0.9;
        ctx.drawImage(sil, kind === 'shadow' ? size : 0, kind === 'shadow' ? size : 0);
        if (kind === 'glow') ctx.drawImage(sil, 0, 0);
        ctx.restore();
      }
      ctx.drawImage(t0, 0, 0);
      return out;
    });
  };
  const applyGradient = (g: { x0: number; y0: number; x1: number; y1: number }) => {
    if (!target || !base) return;
    const c = blankLike(target);
    const ctx = c.getContext('2d')!;
    const grad = gradKind === 'linear'
      ? ctx.createLinearGradient(g.x0, g.y0, g.x1, g.y1)
      : ctx.createRadialGradient(g.x0, g.y0, 0, g.x0, g.y0, Math.max(1, Math.hypot(g.x1 - g.x0, g.y1 - g.y0)));
    grad.addColorStop(0, paintColor);
    grad.addColorStop(1, bgColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);
    if (sel) {
      // Inside the selection, on the selected layer.
      push({ base: blendMasked(target, c, sel.mask), label: 'Gradient' });
    } else insertAbove(makeLayer(c, 'Gradient'), 'Gradient');
  };
  const pickColorAt = (clientX: number, clientY: number) => {
    const d = displayRef.current;
    if (!d) return;
    const r = d.getBoundingClientRect();
    const x = Math.floor(((clientX - r.left) / r.width) * d.width), y = Math.floor(((clientY - r.top) / r.height) * d.height);
    if (x < 0 || y < 0 || x >= d.width || y >= d.height) return;
    const px = d.getContext('2d')!.getImageData(x, y, 1, 1).data;
    setPaintColor(`#${[px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
  };

  // ---------------- background removal
  const [bgOpen, setBgOpen] = useState(false);
  const [bgMode, setBgMode] = useState<'remove' | 'subject'>('remove');
  const transparent = useMemo(() => (base && tool === 'bg' ? hasTransparency(base) : false), [base, tool]);

  // ---------------- resize state
  const [rz, setRz] = useState<{ w: string; h: string; unit: PhysUnit; dpi: string; lock: boolean; resample: boolean } | null>(null);
  useEffect(() => {
    if (tool === 'resize' && base) setRz({ w: String(base.width), h: String(base.height), unit: 'px', dpi: String(dpi), lock: true, resample: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, base]);

  // ---------------- export state
  const [fmt, setFmt] = useState<PhotoFormat>('jpg');
  const [colour, setColour] = useState<ColourMode>('rgb');
  const [quality, setQuality] = useState(92);

  // ======================================================== render
  if (error) {
    return (
      <div className="h-full min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center p-6">
        <p className="text-sm text-rose-600">{error}</p>
        {onCancel && <button className={btnGhost} onClick={onCancel}>Go back</button>}
      </div>
    );
  }

  const dispW = preview ? preview.canvas.width * viewScale : 0;
  const dispH = preview ? preview.canvas.height * viewScale : 0;
  const tools = TOOLS.filter((t) => !(embedded && t.standaloneOnly) && (pro || !t.proOnly)).sort((a, b) => (pro ? PRO_ORDER.indexOf(a.id) - PRO_ORDER.indexOf(b.id) : 0));

  const renderPanel = (tool: Tool) => {
    if (!base) return null;
    switch (tool) {
      case 'hand':
        return <Section title="Hand"><p className="text-[12px] text-mt-muted">Drag to move around the picture. Scroll or use View → Zoom to get closer. Tip: you can pan with any tool by dragging empty space.</p></Section>;
      case 'zoom':
        return (
          <Section title="Zoom">
            <p className="text-[12px] text-mt-muted">Click to zoom in, Alt-click to zoom out.</p>
            <div className="flex gap-1.5">
              <button className={chip(false)} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Fit</button>
              <button className={chip(false)} onClick={() => preview && setZoom(1 / Math.max(0.0001, (viewScale / zoom) * preview.k))}>100%</button>
              <button className={chip(false)} onClick={() => setZoom((z) => Math.min(8, z * 2))}>Zoom in</button>
            </div>
          </Section>
        );
      case 'eyedropper':
        return (
          <Section title="Eyedropper">
            <p className="text-[12px] text-mt-muted">Click anywhere on the picture to pick its colour. It becomes the foreground colour for the brush, text and gradient.</p>
            <span className="flex items-center gap-2 text-[13px]"><span className="w-8 h-8 rounded-lg border border-mt-border" style={{ background: paintColor }} /> <span className="font-mono">{paintColor.toUpperCase()}</span></span>
          </Section>
        );
      case 'text':
        return (
          <Section title="Text">
            <p className="text-[12px] text-mt-muted">Click on the picture where the text should start, type, then press Enter (Shift+Enter for a new line). Each text goes on its own layer.</p>
            <label className="text-[11px] text-mt-muted">Font<select className={field} value={textOpts.font} onChange={(e) => setTextOpts({ ...textOpts, font: e.target.value })} style={{ fontFamily: `"${textOpts.font}"` }}>{FONT_GROUPS.map((g) => <optgroup key={g.c} label={g.c}>{g.fonts.map((f) => <option key={f} value={f}>{f}</option>)}</optgroup>)}</select></label>
            <Range def={{ key: 'exposure', label: 'Size (px)', min: 8, max: Math.max(200, Math.round(base.width * 0.3)) }} value={textPx} onChange={(v) => setTextOpts({ ...textOpts, size: v })} onCommit={() => {}} />
            <div className="flex gap-1.5 flex-wrap">
              <button className={cx(chip(textOpts.bold), 'font-bold')} onClick={() => setTextOpts({ ...textOpts, bold: !textOpts.bold })}>Bold</button>
              <button className={cx(chip(textOpts.italic), 'italic')} onClick={() => setTextOpts({ ...textOpts, italic: !textOpts.italic })}>Italic</button>
              {(['left', 'center', 'right'] as const).map((a) => <button key={a} className={chip(textOpts.align === a)} onClick={() => setTextOpts({ ...textOpts, align: a })}>{a[0].toUpperCase() + a.slice(1)}</button>)}
            </div>
            <Range def={{ key: 'exposure', label: 'Letter spacing', min: -10, max: 60 }} value={textOpts.spacing} onChange={(v) => setTextOpts({ ...textOpts, spacing: v })} onCommit={() => {}} />
            <p className="text-[12px] font-semibold text-mt-ink mt-1">Effect</p>
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_EFFECTS.map((fx) => (
                <button key={fx.id} onClick={() => setTextOpts({ ...textOpts, effect: fx.id })} aria-pressed={textOpts.effect === fx.id} className={cx('h-14 rounded-lg border flex flex-col items-center justify-center gap-0.5', textOpts.effect === fx.id ? 'border-[#2680EB] ring-1 ring-[#2680EB]' : 'border-mt-border hover:bg-mt-surface2')}>
                  <span className="text-[17px] font-extrabold leading-none text-mt-ink" style={fx.css}>Ag</span>
                  <span className="text-[10px] text-mt-muted">{fx.label}</span>
                </button>
              ))}
            </div>
            {textOpts.effect !== 'none' && textOpts.effect !== 'shadow' && textOpts.effect !== 'lift' && (
              <label className="flex items-center gap-2 text-[12px]">Effect colour <input type="color" value={textOpts.fxColor} onChange={(e) => setTextOpts({ ...textOpts, fxColor: e.target.value })} className="w-8 h-8 rounded border border-mt-border bg-transparent" /></label>
            )}
            <label className="flex items-center gap-2 text-[12px]">Text colour <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="w-8 h-8 rounded border border-mt-border bg-transparent" /></label>
          </Section>
        );
      case 'shape':
        return (
          <Section title="Shape">
            <p className="text-[12px] text-mt-muted">Drag on the picture to draw. Hold Shift for a perfect square or circle. Each shape goes on its own layer.</p>
            <div className="flex gap-1.5">
              {(['rect', 'ellipse', 'line'] as const).map((k) => <button key={k} className={chip(shapeOpts.kind === k)} onClick={() => setShapeOpts({ ...shapeOpts, kind: k })}>{k === 'rect' ? 'Rectangle' : k === 'ellipse' ? 'Ellipse' : 'Line'}</button>)}
            </div>
            {shapeOpts.kind !== 'line' && (
              <div className="flex gap-1.5">
                <button className={chip(shapeOpts.fill)} onClick={() => setShapeOpts({ ...shapeOpts, fill: true })}>Filled</button>
                <button className={chip(!shapeOpts.fill)} onClick={() => setShapeOpts({ ...shapeOpts, fill: false })}>Outline</button>
              </div>
            )}
            <Range def={{ key: 'exposure', label: shapeOpts.fill && shapeOpts.kind !== 'line' ? 'Border (background colour)' : 'Line width', min: 0, max: 120 }} value={shapeOpts.stroke} onChange={(v) => setShapeOpts({ ...shapeOpts, stroke: v })} onCommit={() => {}} />
            {shapeOpts.kind === 'rect' && <Range def={{ key: 'exposure', label: 'Corner radius', min: 0, max: 400 }} value={shapeOpts.radius} onChange={(v) => setShapeOpts({ ...shapeOpts, radius: v })} onCommit={() => {}} />}
            <label className="flex items-center gap-2 text-[12px]">Colour <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="w-8 h-8 rounded border border-mt-border bg-transparent" /></label>
          </Section>
        );
      case 'bucket':
        return (
          <Section title="Paint bucket">
            <p className="text-[12px] text-mt-muted">Click an area to fill it with the foreground colour. Tolerance decides how different a colour can be and still be filled.{sel ? ' Only the selected area is filled.' : ''}</p>
            <Range def={{ key: 'exposure', label: 'Tolerance', min: 0, max: 255 }} value={bucketTol} onChange={setBucketTol} onCommit={() => {}} />
            <label className="flex items-center gap-2 text-[12px]">Colour <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="w-8 h-8 rounded border border-mt-border bg-transparent" /></label>
          </Section>
        );
      case 'gradient':
        return (
          <Section title="Gradient">
            <p className="text-[12px] text-mt-muted">Drag across the picture: the gradient runs from the foreground to the background colour. Inside a selection it fills the selection; otherwise it goes on a new layer you can fade or blend.</p>
            <div className="flex gap-1.5">
              <button className={chip(gradKind === 'linear')} onClick={() => setGradKind('linear')}>Linear</button>
              <button className={chip(gradKind === 'radial')} onClick={() => setGradKind('radial')}>Radial</button>
            </div>
            <span className="h-4 rounded-full border border-mt-border" style={{ background: `linear-gradient(90deg, ${paintColor}, ${bgColor})` }} />
          </Section>
        );
      case 'adjust': {
        const groups = pro
          ? [{ t: 'Light', s: LIGHT_SLIDERS }, { t: 'Colour', s: COLOR_SLIDERS }, { t: 'Detail & effects', s: DETAIL_SLIDERS }]
          : [{ t: 'Light', s: SIMPLE_LIGHT }, { t: 'Colour', s: SIMPLE_COLOR }, { t: 'Detail', s: SIMPLE_DETAIL }];
        return (
          <>
            <div className="pt-4 pb-1 flex gap-2">
              <button className={cx(btnPrimary, 'flex-1')} onClick={runAuto}><Wand2 size={15} /> Auto enhance</button>
              <button className={btnGhost} onClick={() => { setAdjust(NO_ADJUST); commitAdjust(NO_ADJUST, 'Reset all'); }}>Reset</button>
            </div>
            {pro && (
              <div className="pt-3">
                <canvas ref={histRef} className="w-full h-16 rounded-lg bg-mt-surface2" aria-label="Histogram" />
              </div>
            )}
            {groups.map(({ t, s: list }) => (
              <Section key={t} title={t} action={<button className="text-[11px] text-mt-faint hover:text-mt-ink" onClick={() => { const a = { ...adjust }; list.forEach((d) => ((a as any)[d.key] = 0)); setAdjust(a); commitAdjust(a, `Reset ${t}`); }}>Reset</button>}>
                {list.map((d) => (
                  <Range key={d.key} def={d} value={adjust[d.key] as number} onChange={(v) => setOne(d.key, v)} onCommit={commitLive} />
                ))}
              </Section>
            ))}
            <Section title="Black & white">
              <div className="flex gap-2">
                <button className={chip(!adjust.mono)} onClick={() => { const a = { ...adjust, mono: 0 }; setAdjust(a); commitAdjust(a); }}>Colour</button>
                <button className={chip(!!adjust.mono)} onClick={() => { const a = { ...adjust, mono: 1 }; setAdjust(a); commitAdjust(a, 'Black & white'); }}>Black & white</button>
              </div>
            </Section>
            {!pro && <p className="py-3 text-[12px] text-mt-muted">Need curves, levels or per-colour control? Switch to <button className="text-[#3B82C4] font-medium hover:underline" onClick={() => setMode('pro')}>Pro</button>.</p>}
          </>
        );
      }
      case 'color':
        return (
          <>
            <Section title="Levels" action={<button className="text-[11px] text-mt-faint hover:text-mt-ink" onClick={() => { const a = { ...adjust, levelBlack: 0, levelWhite: 255, levelGamma: 100 }; setAdjust(a); commitAdjust(a, 'Reset levels'); }}>Reset</button>}>
              <canvas ref={histRef} className="w-full h-16 rounded-lg bg-mt-surface2" aria-label="Histogram" />
              <Range def={{ key: 'levelBlack', label: 'Black point', min: 0, max: 200 }} value={adjust.levelBlack} onChange={(v) => setOne('levelBlack', Math.min(v, adjust.levelWhite - 10))} onCommit={commitLive} />
              <Range def={{ key: 'levelGamma', label: 'Mid-tones', min: 30, max: 250 }} value={adjust.levelGamma} onChange={(v) => setOne('levelGamma', v)} onCommit={commitLive} />
              <Range def={{ key: 'levelWhite', label: 'White point', min: 55, max: 255 }} value={adjust.levelWhite} onChange={(v) => setOne('levelWhite', Math.max(v, adjust.levelBlack + 10))} onCommit={commitLive} />
              <button className={btnGhost} onClick={() => { if (!preview) return; const au = autoEnhance(preview.data); const a = { ...adjust, levelBlack: au.levelBlack ?? 0, levelWhite: au.levelWhite ?? 255, levelGamma: au.levelGamma ?? 100 }; setAdjust(a); commitAdjust(a, 'Auto levels'); }}><Wand2 size={14} /> Auto levels</button>
            </Section>
            <Section title="Curves" action={<button className="text-[11px] text-mt-faint hover:text-mt-ink" onClick={() => { const a = { ...adjust, curve: NO_ADJUST.curve }; setAdjust(a); commitAdjust(a, 'Reset curves'); }}>Reset</button>}>
              <CurveEditor curves={adjust.curve} onChange={(c) => setAdjust((a) => ({ ...a, curve: c }))} onCommit={commitLive} />
            </Section>
            <Section title="Colour mixer" action={<button className="text-[11px] text-mt-faint hover:text-mt-ink" onClick={() => { const a = { ...adjust, hsl: NO_ADJUST.hsl }; setAdjust(a); commitAdjust(a, 'Reset mixer'); }}>Reset</button>}>
              <HslMixer values={adjust.hsl} onChange={(i, v) => setArr('hsl', i, v)} onCommit={commitLive} />
            </Section>
            <Section title="Colour grading" action={<button className="text-[11px] text-mt-faint hover:text-mt-ink" onClick={() => { const a = { ...adjust, grade: NO_ADJUST.grade }; setAdjust(a); commitAdjust(a, 'Reset grading'); }}>Reset</button>}>
              {['Shadows', 'Mid-tones', 'Highlights'].map((lab, j) => (
                <div key={lab} className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-mt-ink">{lab}</span>
                  <HueRange value={adjust.grade[j * 2]} onChange={(v) => setArr('grade', j * 2, v)} onCommit={commitLive} />
                  <Range def={{ key: 'grade', label: 'Amount', min: 0, max: 100 }} value={adjust.grade[j * 2 + 1]} onChange={(v) => setArr('grade', j * 2 + 1, v)} onCommit={commitLive} />
                </div>
              ))}
            </Section>
          </>
        );
      case 'looks':
        return (
          <Section title="One-tap looks">
            <div className="grid grid-cols-2 gap-2">
              {LOOKS.map((l) => (
                <LookTile key={l.id} look={l} preview={preview} active={JSON.stringify({ ...NO_ADJUST, ...l.adjust }) === JSON.stringify(adjust)} onPick={() => { const a = { ...NO_ADJUST, ...l.adjust }; setAdjust(a); commitAdjust(a, l.name); }} />
              ))}
            </div>
            <p className="text-[12px] text-mt-muted">Pick a look, then fine-tune it in Adjust.</p>
          </Section>
        );
      case 'crop': {
        const outW = exactPx ? exactPx.w : Math.round(box?.w || 0);
        const outH = exactPx ? exactPx.h : Math.round(box?.h || 0);
        const enlarging = exactPx && box ? outW > box.w * 1.05 : false;
        const unitShown: PhysUnit = exact?.unit || 'cm';
        const d = exactPx?.dpi || dpi;
        return (
          <>
            <Section title="Shape">
              <div className="flex flex-wrap gap-1.5">
                {RATIOS.map((r) => (
                  <button key={r.id} className={chip(!exact && ratioId === r.id)} onClick={() => { setExact(null); setRatioId(r.id); }}>{r.label}</button>
                ))}
              </div>
            </Section>
            <Section title="Exact size" action={exact ? <button className="text-[11px] text-mt-faint hover:text-mt-ink" onClick={() => setExact(null)}>Clear</button> : null}>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_PRESETS.map((p) => (
                  <button key={p.label} className={chip(!!exact && exact.w === String(p.w) && exact.h === String(p.h) && exact.unit === p.unit)} onClick={() => setExact({ w: String(p.w), h: String(p.h), unit: p.unit, dpi: String(p.dpi) })}>{p.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <label className="text-[11px] text-mt-muted">Width<input className={field} inputMode="decimal" value={exact?.w ?? ''} placeholder="10" onChange={(e) => setExact({ w: e.target.value, h: exact?.h ?? '', unit: exact?.unit ?? 'cm', dpi: exact?.dpi ?? String(dpi) })} /></label>
                <span className="pb-2 text-mt-faint">×</span>
                <label className="text-[11px] text-mt-muted">Height<input className={field} inputMode="decimal" value={exact?.h ?? ''} placeholder="10" onChange={(e) => setExact({ w: exact?.w ?? '', h: e.target.value, unit: exact?.unit ?? 'cm', dpi: exact?.dpi ?? String(dpi) })} /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-mt-muted">Unit
                  <select className={field} value={unitShown} onChange={(e) => setExact({ w: exact?.w ?? '', h: exact?.h ?? '', unit: e.target.value as PhysUnit, dpi: exact?.dpi ?? String(dpi) })}>
                    <option value="cm">cm</option><option value="mm">mm</option><option value="in">inches</option><option value="px">pixels</option>
                  </select>
                </label>
                <label className="text-[11px] text-mt-muted">Resolution (DPI)<input className={field} inputMode="numeric" value={exact?.dpi ?? String(dpi)} onChange={(e) => setExact({ w: exact?.w ?? '', h: exact?.h ?? '', unit: exact?.unit ?? 'cm', dpi: e.target.value })} /></label>
              </div>
              {exactPx && (
                <p className="text-[12px] text-mt-muted">
                  Result: <b className="text-mt-ink">{exactPx.w} × {exactPx.h} px</b>
                  {exact!.unit !== 'px' && <> — exactly {exact!.w} × {exact!.h} {exact!.unit} at {exactPx.dpi} DPI</>}
                </p>
              )}
              {enlarging && <p className="text-[12px] text-amber-700 dark:text-amber-400">The area you picked is smaller than this size, so it will be enlarged and may look soft. Make the box bigger or lower the DPI.</p>}
            </Section>
            <Section title="Straighten & rotate">
              <Range def={{ key: 'exposure', label: 'Straighten', min: -45, max: 45 }} value={cropAngle} onChange={setCropAngle} onCommit={() => {}} />
              <div className="flex flex-wrap gap-1.5">
                <button className={btnGhost} onClick={() => runAll('Rotate left', (c) => rotate90(c, -1))}><RotateCcw size={15} /> Left</button>
                <button className={btnGhost} onClick={() => runAll('Rotate right', (c) => rotate90(c, 1))}><RotateCw size={15} /> Right</button>
                <button className={btnGhost} onClick={() => runAll('Flip', (c) => flip(c, 'h'))} aria-label="Flip horizontally"><FlipHorizontal2 size={15} /></button>
                <button className={btnGhost} onClick={() => runAll('Flip', (c) => flip(c, 'v'))} aria-label="Flip vertically"><FlipVertical2 size={15} /></button>
              </div>
            </Section>
            <div className="py-4 flex gap-2">
              <button className={btnGhost} onClick={() => { setExact(null); setRatioId('free'); setCropAngle(0); resetBox(null); }}>Reset</button>
              <button className={cx(btnPrimary, 'flex-1')} onClick={applyCrop}><Check size={15} /> Apply crop · {outW} × {outH}</button>
            </div>
          </>
        );
      }
      case 'bg':
        return (
          <>
            <Section title="Remove background">
              <p className="text-[12px] text-mt-muted">Finds the person or product and removes everything behind it. Runs on your device — your photo isn’t uploaded.</p>
              <button className={btnPrimary} onClick={() => setBgOpen(true)}><Scissors size={15} /> Remove background</button>
            </Section>
            <Section title="New background">
              {!transparent && <p className="text-[12px] text-mt-faint">Remove the background first, then pick a colour to put behind it.</p>}
              <div className={cx('flex flex-wrap gap-2', !transparent && 'opacity-40 pointer-events-none')}>
                {['#FFFFFF', '#F4F4F5', '#111111', '#DCEBFF', '#FCE7EF', '#E7F6EC', '#FFF3D6', '#2B3A67'].map((c) => (
                  <button key={c} aria-label={`Fill ${c}`} onClick={() => run('Background colour', () => fillBackground(target!, c))} className="w-9 h-9 rounded-full border border-mt-border shadow-sm" style={{ background: c }} />
                ))}
                <label className="w-9 h-9 rounded-full border border-dashed border-mt-border inline-flex items-center justify-center cursor-pointer text-[10px] text-mt-muted" title="Any colour">
                  +<input type="color" className="sr-only" onChange={(e) => run('Background colour', () => fillBackground(target!, e.target.value))} />
                </label>
              </div>
              <p className="text-[12px] text-mt-muted">Leave it see-through to use the cut-out in a design. Export as PNG or TIFF to keep the transparency.</p>
            </Section>
          </>
        );
      case 'retouch': {
        const kinds = RETOUCH.filter((k) => pro || !k.pro);
        const cur = RETOUCH.find((k) => k.id === retouch) || RETOUCH[0];
        return (
          <>
            <Section title="Brush">
              <div className="flex flex-wrap gap-1.5">
                {kinds.map((k) => (
                  <button key={k.id} className={chip(retouch === k.id)} onClick={() => setRetouch(k.id)}>{k.label}</button>
                ))}
              </div>
              <p className="text-[12px] text-mt-muted">{cur.hint}</p>
              {retouch === 'paint' && (
                <div className="flex flex-wrap items-center gap-2">
                  {['#111111', '#FFFFFF', '#E11D48', '#F59E0B', '#16A34A', '#2563EB', '#7C3AED'].map((c) => (
                    <button key={c} aria-label={`Colour ${c}`} onClick={() => setPaintColor(c)} className={cx('w-7 h-7 rounded-full border shadow-sm', paintColor === c ? 'ring-2 ring-offset-2 ring-[#3B82C4] border-transparent' : 'border-mt-border')} style={{ background: c }} />
                  ))}
                  <label className="w-7 h-7 rounded-full border border-dashed border-mt-border inline-flex items-center justify-center cursor-pointer text-[10px] text-mt-muted" title="Any colour" style={{ background: paintColor }}>
                    <input type="color" className="sr-only" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} />
                  </label>
                </div>
              )}
              {isPaint && layers && <p className="text-[12px] text-mt-faint">Painting on “{layers[activeIdx].name}”{sel ? ', inside the selection' : ''}. Tip: add a new empty layer first so you can change it later.</p>}
              <Range def={{ key: 'exposure', label: 'Brush size', min: 8, max: 240 }} value={healSize} onChange={setHealSize} onCommit={() => {}} />
              {retouch !== 'heal' && (
                <Range def={{ key: 'exposure', label: isPaint ? 'Opacity' : 'Strength', min: 5, max: 100 }} value={brushStrength} onChange={setBrushStrength} onCommit={() => {}} />
              )}
              {pro && retouch !== 'heal' && (
                <Range def={{ key: 'exposure', label: 'Hardness', min: 0, max: 95 }} value={brushHardness} onChange={setBrushHardness} onCommit={() => {}} />
              )}
              <p className="text-[12px] text-mt-faint">Tip: zoom in for small details. Each stroke can be undone with Ctrl/⌘ Z.</p>
            </Section>
            {!pro && <p className="py-3 text-[12px] text-mt-muted">Dodge, burn and sharpen brushes are in <button className="text-[#3B82C4] font-medium hover:underline" onClick={() => setMode('pro')}>Pro</button>.</p>}
          </>
        );
      }
      case 'resize': {
        if (!rz) return null;
        const d = Math.max(1, parseFloat(rz.dpi) || 72);
        const wpx = Math.round(toPx(parseFloat(rz.w) || 0, rz.unit, d));
        const hpx = Math.round(toPx(parseFloat(rz.h) || 0, rz.unit, d));
        const setW = (v: string) => {
          const n = parseFloat(v);
          if (rz.lock && n > 0) setRz({ ...rz, w: v, h: fmtNum(n * (base.height / base.width), rz.unit) });
          else setRz({ ...rz, w: v });
        };
        const setH = (v: string) => {
          const n = parseFloat(v);
          if (rz.lock && n > 0) setRz({ ...rz, h: v, w: fmtNum(n * (base.width / base.height), rz.unit) });
          else setRz({ ...rz, h: v });
        };
        const setUnit = (u: PhysUnit) => {
          const wp = toPx(parseFloat(rz.w) || 0, rz.unit, d), hp = toPx(parseFloat(rz.h) || 0, rz.unit, d);
          setRz({ ...rz, unit: u, w: fmtNum(fromPx(wp, u, d), u), h: fmtNum(fromPx(hp, u, d), u) });
        };
        return (
          <Section title="Image size">
            <p className="text-[12px] text-mt-muted">Now {base.width} × {base.height} px — prints at {fmtNum(fromPx(base.width, 'cm', dpi), 'cm')} × {fmtNum(fromPx(base.height, 'cm', dpi), 'cm')} cm at {dpi} DPI.</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <label className="text-[11px] text-mt-muted">Width<input className={field} inputMode="decimal" value={rz.w} onChange={(e) => setW(e.target.value)} /></label>
              <button className={iconBtn} aria-label={rz.lock ? 'Unlock proportions' : 'Lock proportions'} onClick={() => setRz({ ...rz, lock: !rz.lock })}>{rz.lock ? <Lock size={14} /> : <Unlock size={14} />}</button>
              <label className="text-[11px] text-mt-muted">Height<input className={field} inputMode="decimal" value={rz.h} onChange={(e) => setH(e.target.value)} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-mt-muted">Unit
                <select className={field} value={rz.unit} onChange={(e) => setUnit(e.target.value as PhysUnit)}>
                  <option value="px">pixels</option><option value="cm">cm</option><option value="mm">mm</option><option value="in">inches</option>
                </select>
              </label>
              <label className="text-[11px] text-mt-muted">Resolution (DPI)<input className={field} inputMode="numeric" value={rz.dpi} onChange={(e) => setRz({ ...rz, dpi: e.target.value })} /></label>
            </div>
            <label className="flex items-center gap-2 text-[12px] text-mt-ink">
              <input type="checkbox" className="w-4 h-4 accent-[#3B82C4]" checked={rz.resample} onChange={(e) => setRz({ ...rz, resample: e.target.checked })} />
              Change the pixels (untick to only change the print size)
            </label>
            {rz.resample ? (
              <p className="text-[12px] text-mt-muted">New size: <b className="text-mt-ink">{wpx} × {hpx} px</b>{wpx > base.width * 1.05 ? ' — enlarging can look soft.' : ''}</p>
            ) : (
              <p className="text-[12px] text-mt-muted">Pixels stay {base.width} × {base.height}; it will print at {fmtNum(fromPx(base.width, 'cm', d), 'cm')} × {fmtNum(fromPx(base.height, 'cm', d), 'cm')} cm.</p>
            )}
            <button
              className={btnPrimary}
              disabled={rz.resample ? !(wpx > 0 && hpx > 0) || wpx * hpx > 120_000_000 : false}
              onClick={() => {
                if (!rz.resample) {
                  // Only the print resolution changes.
                  const nd = Math.round(base.width / (fromPx(toPx(parseFloat(rz.w) || 0, rz.unit, d), 'in', d) || 1));
                  push({ dpi: rz.unit === 'px' ? Math.round(d) : Math.max(1, nd), label: 'Print size' });
                } else runAll('Resize', (c) => resample(c, wpx, hpx), { dpi: Math.round(d) });
              }}
            >
              <Maximize2 size={15} /> Apply size
            </button>
          </Section>
        );
      }
      case 'move':
        return (
          <Section title="Move">
            <p className="text-[12px] text-mt-muted">Drag on the picture to move the selected layer <b className="text-mt-ink">({layers?.[activeIdx]?.name})</b>. Pick another layer in the Layers panel below.</p>
            <div className="flex flex-wrap gap-1.5">
              <button className={btnGhost} onClick={() => placeRef.current?.click()}>Add image layer</button>
              <button className={btnGhost} onClick={() => layerOps.duplicate()}>Duplicate layer</button>
            </div>
            <p className="text-[12px] text-mt-faint">Tip: add a logo or second photo as a layer, move it into place, then change its opacity or blend mode.</p>
          </Section>
        );
      case 'select':
        return (
          <>
            <Section title="Selection">
              <div className="flex flex-wrap gap-1.5">
                <button className={chip(selKind === 'rect')} onClick={() => setSelKind('rect')}>Rectangle</button>
                <button className={chip(selKind === 'ellipse')} onClick={() => setSelKind('ellipse')}>Ellipse</button>
                <button className={chip(false)} onClick={selOps.subject}><Wand2 size={13} className="inline -mt-0.5 mr-1" />Subject</button>
              </div>
              <p className="text-[12px] text-mt-muted">Drag on the picture to select an area (hold Shift for a perfect square or circle). <b className="text-mt-ink">Subject</b> finds the person or product for you.</p>
              <div className="flex flex-wrap gap-1.5">
                <button className={chip(false)} onClick={selOps.all}>Select all</button>
                <button className={chip(false)} onClick={selOps.invert} disabled={!sel}>Invert</button>
                <button className={chip(false)} onClick={selOps.none} disabled={!sel}>Deselect</button>
              </div>
            </Section>
            <Section title="With the selection">
              {!sel && <p className="text-[12px] text-mt-faint">Make a selection first.</p>}
              <div className={cx('flex flex-col gap-2', !sel && 'opacity-40 pointer-events-none')}>
                <button className={btnGhost} onClick={selOps.toLayer}>Copy to new layer</button>
                <button className={btnGhost} onClick={selOps.clear}>Delete (make see-through)</button>
                <label className={cx(btnGhost, 'cursor-pointer')}>Fill with colour…<input type="color" className="sr-only" onChange={(e) => selOps.fill(e.target.value)} /></label>
                <button className={btnGhost} onClick={() => setTool('adjust')}>Adjust only this area → Filters / Retouch</button>
              </div>
              <p className="text-[12px] text-mt-faint">Filters, paint and eraser only change the selected area.</p>
            </Section>
          </>
        );
      case 'filter':
        return (
          <>
            <Section title="Filters">
              <div className="grid grid-cols-2 gap-1.5">
                {FILTERS.map((x) => (
                  <button key={x.id} onClick={() => pickFilter(x.id)} className={cx('h-9 rounded-lg text-[12px] font-medium border text-left px-2.5', filterId === x.id ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border hover:bg-mt-surface2')}>{x.label}</button>
                ))}
              </div>
              <p className="text-[12px] text-mt-muted">{fdef.hint} {sel ? 'Only the selected area changes.' : `Applies to the layer “${layers?.[activeIdx]?.name}”.`}</p>
              {fdef.amount && <Range def={{ key: 'exposure', label: fdef.amount.label, min: fdef.amount.min, max: fdef.amount.max }} value={filterAmt} onChange={setFilterAmt} onCommit={() => {}} />}
              {fdef.angle && <Range def={{ key: 'exposure', label: 'Angle', min: -90, max: 90 }} value={filterAngle} onChange={setFilterAngle} onCommit={() => {}} />}
            </Section>
            <div className="py-4 flex gap-2">
              <button className={btnGhost} onClick={() => setTool('adjust')}>Cancel</button>
              <button className={cx(btnPrimary, 'flex-1')} onClick={applyFilterNow}><Check size={15} /> Apply {fdef.label}</button>
            </div>
          </>
        );
      case 'export': {
        const info = FORMAT_INFO[fmt];
        const cmykOk = info.cmyk;
        return (
          <>
            <Section title="File type">
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(FORMAT_INFO) as PhotoFormat[]).map((f) => (
                  <button key={f} onClick={() => setFmt(f)} className={cx('text-left rounded-xl border px-3 py-2 transition-colors', fmt === f ? 'border-transparent mt-spectrum-border bg-mt-surface' : 'border-mt-border hover:bg-mt-surface2')}>
                    <span className="text-[13px] font-semibold text-mt-ink">{FORMAT_INFO[f].label}</span>
                    <span className="block text-[11px] text-mt-muted">{FORMAT_INFO[f].note}{FORMAT_INFO[f].cmyk ? ' · RGB or CMYK' : ''}</span>
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Colour">
              <div className="flex gap-2">
                <button className={chip(colour === 'rgb' || !cmykOk)} onClick={() => setColour('rgb')}>RGB — screens</button>
                <button className={chip(colour === 'cmyk' && cmykOk)} disabled={!cmykOk} onClick={() => setColour('cmyk')} title={cmykOk ? '' : 'Choose TIFF or PDF for CMYK'}>CMYK — print</button>
              </div>
              {cmykOk && colour === 'cmyk' ? (
                <p className="text-[12px] text-mt-muted">A true 4-ink CMYK file, converted with the {PRESS_PROFILE_NAME} press profile, which is embedded in the file. Turn on <b>Print preview</b> above to see how colours will print.</p>
              ) : !cmykOk ? (
                <p className="text-[12px] text-mt-faint">{info.label} files are always RGB. For CMYK, choose TIFF or PDF.</p>
              ) : null}
            </Section>
            {(fmt === 'jpg' || fmt === 'webp') && (
              <Section title="Quality">
                <Range def={{ key: 'exposure', label: 'Quality', min: 40, max: 100 }} value={quality} onChange={setQuality} onCommit={() => {}} />
              </Section>
            )}
            <Section title="Size">
              <p className="text-[12px] text-mt-muted">{base.width} × {base.height} px · {dpi} DPI · prints at {fmtNum(fromPx(base.width, 'cm', dpi), 'cm')} × {fmtNum(fromPx(base.height, 'cm', dpi), 'cm')} cm. Change it in Resize.</p>
            </Section>
            <div className="py-4">
              <button
                className={cx(btnPrimary, 'w-full')}
                disabled={!!busy}
                onClick={async () => {
                  setBusy('Exporting');
                  await new Promise((r) => setTimeout(r, 30));
                  try {
                    const out = renderResult()!;
                    const blob = await exportPhoto(out, { format: fmt, colour: cmykOk ? colour : 'rgb', quality: quality / 100, dpi });
                    downloadBlob(blob, `${(props.name || 'photo').replace(/[\\/:*?"<>|]+/g, '-')}${cmykOk && colour === 'cmyk' ? '-cmyk' : ''}.${extFor(fmt)}`);
                  } catch (e) {
                    console.error(e);
                    setNotice('The file couldn’t be made. Please try again.');
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                <Download size={15} /> Download {info.label}{cmykOk && colour === 'cmyk' ? ' (CMYK)' : ''}
              </button>
            </div>
          </>
        );
      }
    }
  };
  const panel = renderPanel(tool);

  const healCursor = tool === 'retouch' || tool === 'select';

  // ---------------- Pro chrome: toolbar + contextual options bar
  const swapColours = () => { const f = paintColor; setPaintColor(bgColor); setBgColor(f); };
  const pickProTool = (t: ProTool) => {
    if (t.retouch) setRetouch(t.retouch);
    setTool(t.tool);
    if (t.subject) selOps.subject();
  };
  const proToolbar = (
    <nav className="order-3 lg:order-1 shrink-0 lg:w-[46px] flex lg:flex-col items-center gap-0.5 px-1 lg:px-0 py-1.5 bg-mt-surface border-t lg:border-t-0 lg:border-r border-mt-border overflow-x-auto lg:overflow-y-auto mt-scroll" aria-label="Tools">
      {PRO_TOOLBAR.map((t, i) => {
        if (!t) return <span key={i} className="shrink-0 w-px h-6 lg:w-7 lg:h-px bg-mt-input-border my-1 mx-1 lg:mx-0" />;
        const I = t.icon;
        const on = !t.subject && tool === t.tool && (!t.retouch || retouch === t.retouch);
        return (
          <button key={t.label} onClick={() => pickProTool(t)} aria-pressed={on} aria-label={t.label} title={`${t.label} (${t.key})`}
            className="mt-ps-tool shrink-0 w-9 h-9 rounded-md inline-flex items-center justify-center text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
            <I size={17} />
          </button>
        );
      })}
      <span className="shrink-0 w-px h-6 lg:w-7 lg:h-px bg-mt-input-border my-1 mx-1 lg:mx-0" />
      {/* foreground / background colours */}
      <div className="relative shrink-0 w-10 h-10 lg:mt-1" aria-label="Colours">
        <label className="absolute right-0 bottom-0 w-6 h-6 rounded-sm border border-white/70 ring-1 ring-black/40 shadow cursor-pointer" style={{ background: bgColor }} title="Background colour">
          <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="sr-only" aria-label="Background colour" />
        </label>
        <label className="absolute left-0 top-0 w-6 h-6 rounded-sm border border-white/70 ring-1 ring-black/40 shadow cursor-pointer" style={{ background: paintColor }} title="Foreground colour">
          <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="sr-only" aria-label="Foreground colour" />
        </label>
      </div>
      <div className="shrink-0 flex lg:flex-row gap-0.5">
        <button className="w-5 h-5 inline-flex items-center justify-center text-mt-muted hover:text-mt-ink" onClick={swapColours} title="Swap colours (X)" aria-label="Swap colours"><ArrowLeftRight size={11} /></button>
        <button className="w-5 h-5 inline-flex items-center justify-center text-mt-muted hover:text-mt-ink" onClick={() => { setPaintColor('#000000'); setBgColor('#FFFFFF'); }} title="Default colours (D)" aria-label="Default colours"><Circle size={10} /></button>
      </div>
    </nav>
  );
  const optLabel = 'text-mt-muted';
  const optField = 'h-7 rounded border border-mt-input-border bg-mt-bg px-1.5 text-[12px] text-mt-ink tabular-nums focus:outline-none focus:border-[#2680EB]';
  const optBtn = 'h-7 px-2.5 rounded border border-mt-input-border text-[12px] text-mt-ink hover:bg-mt-surface2 disabled:opacity-40';
  const optOn = (on: boolean) => cx(optBtn, on && 'bg-[#2680EB] border-[#2680EB] text-white hover:bg-[#2680EB]');
  const activeProTool = PRO_TOOLBAR.find((t) => t && !t.subject && t.tool === tool && (!t.retouch || t.retouch === retouch)) || null;
  const ToolGlyph = activeProTool?.icon;
  const optionsBar = (
    <div className="h-10 shrink-0 flex items-center gap-3 px-3 bg-mt-surface border-b border-mt-border text-[12px] overflow-x-auto mt-scroll whitespace-nowrap" aria-label="Tool options">
      <span className="inline-flex items-center gap-1.5 pr-3 border-r border-mt-input-border text-mt-ink font-medium">
        {ToolGlyph ? <ToolGlyph size={15} /> : null}
        {activeProTool?.label || (TOOLS.find((t) => t.id === tool)?.label ?? '')}
      </span>
      {tool === 'retouch' && (
        <>
          <label className="inline-flex items-center gap-1.5"><span className={optLabel}>Brush</span>
            <select className={optField} value={retouch} onChange={(e) => setRetouch(e.target.value as RetouchKind)}>
              {RETOUCH.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5"><span className={optLabel}>Size</span>
            <input type="range" min={8} max={240} value={healSize} onChange={(e) => setHealSize(+e.target.value)} className="w-24 accent-[#2680EB]" />
            <span className="w-10 tabular-nums">{healSize} px</span>
          </label>
          {retouch !== 'heal' && (
            <label className="inline-flex items-center gap-1.5"><span className={optLabel}>{retouch === 'paint' || retouch === 'erase' ? 'Opacity' : 'Strength'}</span>
              <input type="range" min={5} max={100} value={brushStrength} onChange={(e) => setBrushStrength(+e.target.value)} className="w-24 accent-[#2680EB]" />
              <span className="w-9 tabular-nums">{brushStrength}%</span>
            </label>
          )}
          {retouch === 'paint' && (
            <label className="inline-flex items-center gap-1.5"><span className={optLabel}>Colour</span>
              <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="w-7 h-7 rounded border border-mt-input-border bg-transparent" />
            </label>
          )}
          <span className={optLabel}>[ ] change size</span>
        </>
      )}
      {tool === 'select' && (
        <>
          <button className={optOn(selKind === 'rect')} onClick={() => setSelKind('rect')}>Rectangle</button>
          <button className={optOn(selKind === 'ellipse')} onClick={() => setSelKind('ellipse')}>Ellipse</button>
          <span className="w-px h-5 bg-mt-input-border" />
          <button className={optBtn} onClick={selOps.subject}>Select subject</button>
          <button className={optBtn} onClick={selOps.all}>All</button>
          <button className={optBtn} onClick={selOps.invert} disabled={!sel}>Inverse</button>
          <button className={optBtn} onClick={selOps.none} disabled={!sel}>Deselect</button>
          <button className={optBtn} onClick={selOps.toLayer}>Layer via copy</button>
        </>
      )}
      {tool === 'crop' && (
        <>
          <span className={optLabel}>Drag the corners, then</span>
          <button className={optOn(true)} onClick={applyCrop}>Apply crop (Enter)</button>
        </>
      )}
      {tool === 'move' && <span className={optLabel}>Moving layer “{layers?.[activeIdx]?.name}”. Choose another layer on the right.</span>}
      {tool === 'eyedropper' && (
        <>
          <span className={optLabel}>Click the picture to pick a colour</span>
          <span className="w-6 h-6 rounded border border-white/60" style={{ background: paintColor }} />
          <span className="tabular-nums uppercase">{paintColor}</span>
        </>
      )}
      {tool === 'text' && (
        <>
          <select className={optField} value={textOpts.font} onChange={(e) => setTextOpts((o) => ({ ...o, font: e.target.value }))} aria-label="Font">
            {FONT_GROUPS.map((g) => <optgroup key={g.c} label={g.c}>{g.fonts.map((f) => <option key={f} value={f}>{f}</option>)}</optgroup>)}
          </select>
          <label className="inline-flex items-center gap-1.5"><span className={optLabel}>Size</span>
            <input type="number" min={6} max={2000} value={textPx} onChange={(e) => setTextOpts((o) => ({ ...o, size: Math.max(6, +e.target.value || 0) }))} className={cx(optField, 'w-16')} />
            <span className={optLabel}>px</span>
          </label>
          <button className={cx(optOn(textOpts.bold), 'font-bold')} onClick={() => setTextOpts((o) => ({ ...o, bold: !o.bold }))} aria-pressed={textOpts.bold}>B</button>
          <button className={cx(optOn(textOpts.italic), 'italic')} onClick={() => setTextOpts((o) => ({ ...o, italic: !o.italic }))} aria-pressed={textOpts.italic}>I</button>
          <select className={optField} value={textOpts.align} onChange={(e) => setTextOpts((o) => ({ ...o, align: e.target.value as any }))} aria-label="Align"><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select>
          <select className={optField} value={textOpts.effect} onChange={(e) => setTextOpts((o) => ({ ...o, effect: e.target.value as TextEffect }))} aria-label="Text effect">{TEXT_EFFECTS.map((fx) => <option key={fx.id} value={fx.id}>{fx.label}</option>)}</select>
          <input type="color" value={paintColor} onChange={(e) => setPaintColor(e.target.value)} className="w-7 h-7 rounded border border-mt-input-border bg-transparent" aria-label="Text colour" />
          <span className={optLabel}>Click the picture to type · Enter to place</span>
        </>
      )}
      {tool === 'shape' && (
        <>
          {(['rect', 'ellipse', 'line'] as const).map((k) => <button key={k} className={optOn(shapeOpts.kind === k)} onClick={() => setShapeOpts((o) => ({ ...o, kind: k }))}>{k === 'rect' ? 'Rectangle' : k === 'ellipse' ? 'Ellipse' : 'Line'}</button>)}
          {shapeOpts.kind !== 'line' && <button className={optOn(shapeOpts.fill)} onClick={() => setShapeOpts((o) => ({ ...o, fill: !o.fill }))}>{shapeOpts.fill ? 'Filled' : 'Outline'}</button>}
          <label className="inline-flex items-center gap-1.5"><span className={optLabel}>{shapeOpts.kind === 'line' || !shapeOpts.fill ? 'Width' : 'Border'}</span><input type="number" min={0} max={400} value={shapeOpts.stroke} onChange={(e) => setShapeOpts((o) => ({ ...o, stroke: Math.max(0, +e.target.value || 0) }))} className={cx(optField, 'w-14')} /></label>
          {shapeOpts.kind === 'rect' && <label className="inline-flex items-center gap-1.5"><span className={optLabel}>Radius</span><input type="number" min={0} max={2000} value={shapeOpts.radius} onChange={(e) => setShapeOpts((o) => ({ ...o, radius: Math.max(0, +e.target.value || 0) }))} className={cx(optField, 'w-14')} /></label>}
          <span className={optLabel}>Drag on the picture · Shift keeps it square</span>
        </>
      )}
      {tool === 'bucket' && (
        <>
          <label className="inline-flex items-center gap-1.5"><span className={optLabel}>Tolerance</span><input type="range" min={0} max={255} value={bucketTol} onChange={(e) => setBucketTol(+e.target.value)} className="w-28 accent-[#2680EB]" /><span className="w-8 tabular-nums">{bucketTol}</span></label>
          <span className="w-6 h-6 rounded border border-white/60 ring-1 ring-black/30" style={{ background: paintColor }} />
          <span className={optLabel}>Click an area to fill it</span>
        </>
      )}
      {tool === 'gradient' && (
        <>
          <span className="w-24 h-4 rounded-sm border border-white/40" style={{ background: gradKind === 'linear' ? `linear-gradient(90deg, ${paintColor}, ${bgColor})` : `radial-gradient(circle, ${paintColor}, ${bgColor})` }} />
          <button className={optOn(gradKind === 'linear')} onClick={() => setGradKind('linear')}>Linear</button>
          <button className={optOn(gradKind === 'radial')} onClick={() => setGradKind('radial')}>Radial</button>
          <span className={optLabel}>Drag across the picture{sel ? ' (fills the selection)' : ' (adds a new layer)'}</span>
        </>
      )}
      {(tool === 'zoom' || tool === 'hand') && (
        <>
          <button className={optBtn} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Fit screen</button>
          <button className={optBtn} onClick={() => preview && setZoom(1 / Math.max(0.0001, (viewScale / zoom) * preview.k))}>100%</button>
          <span className={optLabel}>{tool === 'zoom' ? 'Click to zoom in · Alt-click to zoom out' : 'Drag to move around'}</span>
        </>
      )}
      {!CANVAS_TOOLS.includes(tool) && <span className={optLabel}>Changes apply to {sel ? 'the selected area' : `the layer “${layers?.[activeIdx]?.name}”`}. Use the panel on the right.</span>}
      {(tool === 'bg' || tool === 'resize' || tool === 'export') && <span className={optLabel}>Use the panel on the right.</span>}
    </div>
  );
  const downloadPng = async () => {
    const out = renderResult();
    if (!out) return;
    const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/png'));
    if (blob) downloadBlob(blob, `${(props.name || 'photo').replace(/[\\/:*?"<>|]+/g, '-')}.png`);
  };
  const retouchWith = (k: RetouchKind) => { setRetouch(k); setTool('retouch'); };
  const hasSel = !!sel, multi = (layers?.length || 0) > 1;
  const menus: Menu[] = !pro ? [] : [
    { label: 'File', items: [
      ...(!embedded ? [{ label: 'Open picture…', shortcut: 'Ctrl O', onClick: () => fileRef.current?.click() }] : []),
      { label: 'Place picture as layer…', onClick: () => placeRef.current?.click() },
      { sep: true },
      ...(embedded
        ? [{ label: 'Apply to design', shortcut: '', onClick: doApply }, { label: 'Cancel', onClick: () => onCancel?.() }]
        : [{ label: 'Export…', shortcut: 'Ctrl Shift E', onClick: () => setTool('export') }, { label: 'Quick download (PNG)', onClick: downloadPng }]),
    ] },
    { label: 'Edit', items: [
      { label: `Undo ${snap?.label && history.index > 0 ? snap.label : ''}`.trim(), shortcut: 'Ctrl Z', onClick: undo, disabled: history.index <= 0 },
      { label: 'Redo', shortcut: 'Ctrl Shift Z', onClick: redo, disabled: history.index >= history.list.length - 1 },
      { sep: true },
      { label: 'Copy to new layer', shortcut: 'Ctrl J', onClick: selOps.toLayer },
      { label: 'Delete selection', shortcut: 'Del', onClick: selOps.clear, disabled: !hasSel },
      { label: 'Fill with white', onClick: () => selOps.fill('#FFFFFF') },
      { label: 'Fill with black', onClick: () => selOps.fill('#111111') },
      { sep: true },
      { label: 'Paint brush', shortcut: 'B', onClick: () => retouchWith('paint') },
      { label: 'Eraser', shortcut: 'E', onClick: () => retouchWith('erase') },
      { label: 'Heal brush', shortcut: 'J', onClick: () => retouchWith('heal') },
    ] },
    { label: 'Image', items: [
      { label: 'Auto enhance', onClick: () => { setTool('adjust'); runAuto(); } },
      { label: 'Adjustments…', onClick: () => setTool('adjust') },
      { label: 'Levels, curves & colour…', shortcut: 'Ctrl L', onClick: () => setTool('color') },
      { label: 'Looks…', onClick: () => setTool('looks') },
      { sep: true },
      { label: 'Crop & straighten…', shortcut: 'C', onClick: () => setTool('crop') },
      { label: 'Image size…', shortcut: 'Ctrl Alt I', onClick: () => setTool('resize') },
      { label: 'Rotate 90° left', onClick: () => runAll('Rotate left', (c) => rotate90(c, -1)) },
      { label: 'Rotate 90° right', onClick: () => runAll('Rotate right', (c) => rotate90(c, 1)) },
      { label: 'Flip horizontal', onClick: () => runAll('Flip', (c) => flip(c, 'h')) },
      { label: 'Flip vertical', onClick: () => runAll('Flip', (c) => flip(c, 'v')) },
      { sep: true },
      { label: 'Remove background…', onClick: () => { setBgMode('remove'); setBgOpen(true); } },
    ] },
    { label: 'Layer', items: [
      { label: 'New layer', shortcut: 'Ctrl Shift N', onClick: layerOps.add },
      { label: 'Place picture as layer…', onClick: () => placeRef.current?.click() },
      { label: 'Duplicate layer', onClick: layerOps.duplicate },
      { label: 'Delete layer', onClick: layerOps.remove, disabled: !multi },
      { sep: true },
      { label: 'Bring forward', shortcut: 'Ctrl ]', onClick: () => layerOps.move(1), disabled: !layers || activeIdx >= layers.length - 1 },
      { label: 'Send backward', shortcut: 'Ctrl [', onClick: () => layerOps.move(-1), disabled: activeIdx <= 0 },
      { label: 'Merge down', shortcut: 'Ctrl E', onClick: layerOps.mergeDown, disabled: activeIdx <= 0 },
      { label: 'Flatten image', onClick: layerOps.flatten, disabled: !multi },
      { sep: true },
      { label: 'Layer style: Drop shadow', onClick: () => layerStyle('shadow') },
      { label: 'Layer style: Outer glow (foreground colour)', onClick: () => layerStyle('glow') },
      { label: 'Layer style: Stroke (foreground colour)', onClick: () => layerStyle('stroke') },
    ] },
    { label: 'Select', items: [
      { label: 'All', shortcut: 'Ctrl A', onClick: selOps.all },
      { label: 'Deselect', shortcut: 'Ctrl D', onClick: selOps.none, disabled: !hasSel },
      { label: 'Inverse', shortcut: 'Ctrl Shift I', onClick: selOps.invert, disabled: !hasSel },
      { sep: true },
      { label: 'Rectangle', shortcut: 'M', onClick: () => { setSelKind('rect'); setTool('select'); } },
      { label: 'Ellipse', onClick: () => { setSelKind('ellipse'); setTool('select'); } },
      { label: 'Subject (person / product)', onClick: selOps.subject },
    ] },
    { label: 'Filter', items: FILTERS.map((x) => ({ label: `${x.label}${x.amount ? '…' : ''}`, onClick: () => pickFilter(x.id) })) },
    { label: 'View', items: [
      { label: 'Zoom in', shortcut: 'Ctrl +', onClick: () => setZoom((z) => Math.min(8, z * 1.25)) },
      { label: 'Zoom out', shortcut: 'Ctrl −', onClick: () => setZoom((z) => Math.max(0.5, z / 1.25)) },
      { label: 'Fit on screen', shortcut: 'Ctrl 0', onClick: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
      { sep: true },
      { label: 'Print preview (CMYK)', checked: proof, onClick: () => setProof((p) => !p) },
    ] },
    { label: 'Window', items: [
      { label: 'Layers', checked: showLayers, onClick: () => setShowLayers((v) => !v) },
      { label: 'History', checked: showHistory, onClick: () => setShowHistory((v) => !v) },
    ] },
  ];
  return (
    <div className={cx('h-full w-full flex flex-col bg-mt-bg text-mt-ink min-h-0', pro && 'mt-ps')}>
      {/* top bar */}
      <div className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-mt-border bg-mt-surface">
        <div className="min-w-0 flex items-center gap-2">
          {headerLeft}
          <div className="inline-flex rounded-full border border-mt-border p-0.5 text-[12px] font-medium" role="group" aria-label="Editing mode">
            {(['simple', 'pro'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={cx('h-7 px-3 rounded-full transition-colors', mode === m ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-muted hover:text-mt-ink')}>
                {m === 'simple' ? 'Simple' : 'Pro'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center gap-0.5">
          <button className={iconBtn} onClick={undo} disabled={history.index <= 0} aria-label="Undo" title="Undo (Ctrl/⌘ Z)"><Undo2 size={17} /></button>
          <button className={iconBtn} onClick={redo} disabled={history.index >= history.list.length - 1} aria-label="Redo" title="Redo"><Redo2 size={17} /></button>
          <span className="w-px h-5 bg-mt-border mx-1.5 hidden sm:block" />
          <button
            className={cx(iconBtn, 'hidden sm:inline-flex w-auto px-2.5 gap-1.5 text-[12px] font-medium', comparing && 'bg-mt-surface2')}
            onPointerDown={() => setComparing(true)}
            onPointerUp={() => setComparing(false)}
            onPointerLeave={() => setComparing(false)}
            title="Hold to see the original (or hold \)"
          >
            <Eye size={15} /> Before
          </button>
          <button className={cx(iconBtn, 'w-auto px-2.5 gap-1.5 text-[12px] font-medium', proof && 'bg-mt-surface2 text-[#3B82C4]')} onClick={() => setProof((p) => !p)} title="See how the colours will print in CMYK">
            <Printer size={15} /> <span className="hidden md:inline">Print preview</span>
          </button>
          <span className="w-px h-5 bg-mt-border mx-1.5 hidden sm:block" />
          <button className={cx(iconBtn, 'hidden sm:inline-flex')} onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} aria-label="Zoom out"><Minus size={16} /></button>
          <button className="hidden sm:inline-flex text-[12px] tabular-nums w-12 justify-center text-mt-muted" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Fit">{Math.round(basePxToScreen * 100)}%</button>
          <button className={cx(iconBtn, 'hidden sm:inline-flex')} onClick={() => setZoom((z) => Math.min(8, z * 1.25))} aria-label="Zoom in"><Plus size={16} /></button>
          <button className={iconBtn} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Fit to screen"><Maximize size={15} /></button>
        </div>
        <div className="flex items-center gap-2">
          {embedded ? (
            <>
              <button className={btnGhost} onClick={onCancel}><X size={15} /> <span className="hidden sm:inline">Cancel</span></button>
              <button className={btnPrimary} onClick={doApply} disabled={!base || !!busy}><Check size={15} /> Apply to design</button>
            </>
          ) : (
            headerRight
          )}
        </div>
      </div>

      {pro && <ProMenuBar menus={menus} />}
      {pro && base && optionsBar}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {pro && proToolbar}
        {/* tool rail */}
        {!pro && <nav className="order-3 lg:order-1 shrink-0 lg:w-[84px] border-t lg:border-t-0 lg:border-r border-mt-border bg-mt-surface flex lg:flex-col overflow-x-auto mt-scroll" aria-label="Tools">
          {tools.map((t) => {
            const I = t.icon;
            const on = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={cx('shrink-0 min-w-[74px] lg:min-w-0 h-16 flex', pro ? 'lg:h-[58px]' : 'lg:h-[72px]', 'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', on ? 'text-mt-ink' : 'text-mt-muted hover:text-mt-ink')}
                aria-pressed={on}
              >
                <span className={cx('w-10 h-8 rounded-xl inline-flex items-center justify-center', on ? 'bg-mt-primary text-mt-onprimary' : '')}><I size={17} /></span>
                {!pro && t.simpleLabel ? t.simpleLabel : t.label}
              </button>
            );
          })}
        </nav>}

        {/* stage (Pro: with a document tab and a status bar, like Photoshop) */}
        <div className="order-1 lg:order-2 flex-1 min-w-0 min-h-[42vh] flex flex-col">
        {pro && base && (
          <div className="h-8 shrink-0 flex items-end bg-mt-bg border-b border-mt-border px-1">
            <span className="h-7 max-w-full truncate px-3 inline-flex items-center gap-2 rounded-t-md bg-mt-surface text-[12px] text-mt-ink border border-b-0 border-mt-border">
              {props.name || 'Untitled'} @ {Math.round(basePxToScreen * 100)}% ({layers?.[activeIdx]?.name || 'Background'}, RGB/8)
            </span>
          </div>
        )}
        <div
          ref={stageRef}
          className={cx('relative flex-1 min-h-0 overflow-hidden touch-none select-none', pro ? 'bg-mt-studio' : 'bg-[repeating-conic-gradient(rgba(127,127,127,0.10)_0_25%,transparent_0_50%)] bg-[length:22px_22px]', healCursor || tool === 'eyedropper' || tool === 'gradient' ? 'cursor-crosshair' : tool === 'text' ? 'cursor-text' : tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : tool === 'zoom' ? 'cursor-zoom-in' : tool === 'crop' ? 'cursor-default' : tool === 'move' ? 'cursor-move' : zoom > 1 ? 'cursor-grab' : '')}
          onPointerDown={onStageDown}
          onPointerMove={onStageMove}
          onPointerUp={onStageUp}
          onPointerCancel={onStageUp}
          onWheel={onWheel}
        >
          {!preview && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-mt-muted gap-2"><Loader2 className="animate-spin" size={16} /> Opening photo…</div>
          )}
          {preview && (
            <div className="absolute left-1/2 top-1/2" style={{ width: dispW, height: dispH, transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))` }}>
              <canvas ref={displayRef} className={cx('block w-full h-full shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]', pro && 'bg-[repeating-conic-gradient(#cfcfcf_0_25%,#ffffff_0_50%)] bg-[length:16px_16px]')} />
              <canvas ref={draftRef} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" style={{ visibility: 'hidden' }} />
              {tool === 'crop' && box && base && (
                <CropOverlay box={box} base={base} />
              )}
              {selOverlay && <img src={selOverlay} alt="" aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" />}
              {base && (sel?.shape || marquee) && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${base.width} ${base.height}`} preserveAspectRatio="none">
                  {[sel?.shape && !sel.inverted ? sel.shape : null, marquee ? { kind: selKind, ...marquee } : null].filter(Boolean).map((sh: any, i) => {
                    const common = { fill: 'none', vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1.5 };
                    const el = (stroke: string, dash?: string) => sh.kind === 'ellipse'
                      ? <ellipse cx={sh.x + sh.w / 2} cy={sh.y + sh.h / 2} rx={sh.w / 2} ry={sh.h / 2} stroke={stroke} strokeDasharray={dash} {...common} className={dash ? 'mt-ants' : ''} />
                      : <rect x={sh.x} y={sh.y} width={sh.w} height={sh.h} stroke={stroke} strokeDasharray={dash} {...common} className={dash ? 'mt-ants' : ''} />;
                    return <g key={i}>{el('#fff')}{el('#111', '5 5')}</g>;
                  })}
                </svg>
              )}
              {gradDrag && base && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${base.width} ${base.height}`} preserveAspectRatio="none">
                  <line x1={gradDrag.x0} y1={gradDrag.y0} x2={gradDrag.x1} y2={gradDrag.y1} stroke="#fff" strokeWidth={3} vectorEffect="non-scaling-stroke" />
                  <line x1={gradDrag.x0} y1={gradDrag.y0} x2={gradDrag.x1} y2={gradDrag.y1} stroke="#111" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                </svg>
              )}
              {shapeDrag && base && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${base.width} ${base.height}`} preserveAspectRatio="none">
                  {shapeOpts.kind === 'line'
                    ? <line x1={shapeDrag.x0} y1={shapeDrag.y0} x2={shapeDrag.x1} y2={shapeDrag.y1} stroke={paintColor} strokeWidth={Math.max(1, shapeOpts.stroke)} strokeLinecap="round" />
                    : shapeOpts.kind === 'ellipse'
                      ? <ellipse cx={(shapeDrag.x0 + shapeDrag.x1) / 2} cy={(shapeDrag.y0 + shapeDrag.y1) / 2} rx={Math.abs(shapeDrag.x1 - shapeDrag.x0) / 2} ry={Math.abs(shapeDrag.y1 - shapeDrag.y0) / 2} fill={shapeOpts.fill ? paintColor : 'none'} stroke={shapeOpts.fill ? bgColor : paintColor} strokeWidth={shapeOpts.fill ? shapeOpts.stroke : Math.max(1, shapeOpts.stroke)} />
                      : <rect x={Math.min(shapeDrag.x0, shapeDrag.x1)} y={Math.min(shapeDrag.y0, shapeDrag.y1)} width={Math.abs(shapeDrag.x1 - shapeDrag.x0)} height={Math.abs(shapeDrag.y1 - shapeDrag.y0)} rx={shapeOpts.radius} fill={shapeOpts.fill ? paintColor : 'none'} stroke={shapeOpts.fill ? bgColor : paintColor} strokeWidth={shapeOpts.fill ? shapeOpts.stroke : Math.max(1, shapeOpts.stroke)} />}
                </svg>
              )}
              {textDraft && base && (
                <textarea
                  autoFocus
                  ref={(el) => { if (el && !el.dataset.f) { el.dataset.f = '1'; requestAnimationFrame(() => el.focus()); } }}
                  value={textDraft.value}
                  placeholder="Type here"
                  aria-label="Text"
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
                    else if (e.key === 'Escape') setTextDraft(null);
                  }}
                  rows={Math.max(1, textDraft.value.split('\n').length)}
                  className="absolute bg-transparent outline-none border border-dashed border-[#2680EB] resize-none overflow-hidden p-0 m-0 leading-[1.2] placeholder:text-black/30"
                  style={{
                    left: (textDraft.x * dispW) / base.width,
                    top: (textDraft.y * dispH) / base.height,
                    ...(TEXT_EFFECTS.find((x) => x.id === textOpts.effect)?.css || {}),
                    fontFamily: `"${textOpts.font}", sans-serif`,
                    fontWeight: textOpts.bold ? 700 : 400,
                    fontStyle: textOpts.italic ? 'italic' : 'normal',
                    letterSpacing: (textOpts.spacing * dispW) / base.width,
                    textAlign: textOpts.align,
                    fontSize: (textPx * dispW) / base.width,
                    color: paintColor,
                    minWidth: 80,
                    width: Math.max(80, ((Math.max(4, ...textDraft.value.split('\n').map((l) => l.length)) + 1) * textPx * 0.62 * dispW) / base.width),
                  }}
                />
              )}
              {tool === 'retouch' && healPts.length > 0 && base && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${base.width} ${base.height}`} preserveAspectRatio="none">
                  <polyline points={healPts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={retouch === 'paint' ? paintColor : retouch === 'erase' ? 'rgba(255,255,255,0.7)' : 'rgba(242,112,143,0.55)'} strokeOpacity={retouch === 'paint' ? brushStrength / 100 : 1} strokeWidth={healSize / basePxToScreen} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )}
          {tool === 'retouch' && preview && (
            <div ref={brushCursor} className="pointer-events-none absolute left-0 top-0 rounded-full border border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]" style={{ width: healSize, height: healSize }} />
          )}
          {comparing && <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-wide bg-black/70 text-white rounded-full px-3 py-1">Original</span>}
          {proof && !comparing && <span className="absolute top-3 left-3 text-[11px] font-semibold bg-black/70 text-white rounded-full px-3 py-1">Print preview · CMYK FOGRA39</span>}
          {busy && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
              <span className="text-[13px] font-medium bg-mt-surface rounded-full px-4 py-2 shadow inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> {busy}…</span>
            </div>
          )}
          {notice && (
            <button onClick={() => setNotice(null)} className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[12px] bg-mt-surface border border-mt-border rounded-full px-4 py-2 shadow">{notice}</button>
          )}
        </div>
        {pro && base && (
          <div className="h-6 shrink-0 flex items-center gap-4 px-3 bg-mt-surface border-t border-mt-border text-[11px] text-mt-muted tabular-nums" aria-label="Status">
            <span>{Math.round(basePxToScreen * 100)}%</span>
            <span>{base.width} × {base.height} px</span>
            <span>{dpi} DPI · {fmtNum(fromPx(base.width, 'cm', dpi), 'cm')} × {fmtNum(fromPx(base.height, 'cm', dpi), 'cm')} cm</span>
            <span ref={statusRef} className="min-w-[90px]" />
            <span className="ml-auto truncate">{layers?.length || 1} layer{(layers?.length || 1) > 1 ? 's' : ''}{sel ? ' · selection active' : ''}</span>
          </div>
        )}
        </div>

        {/* panel */}
        <aside
          onPointerDownCapture={(e) => { if ((e.target as HTMLElement).closest?.('[data-live]')) setDragging(true); }}
          className={cx('order-2 lg:order-3 shrink-0 max-h-[42vh] lg:max-h-none overflow-y-auto border-t lg:border-t-0 lg:border-l border-mt-border bg-mt-surface', pro ? 'lg:w-[320px] px-3' : 'lg:w-[340px] px-4')}>
          {pro && (
            <div className="sticky top-0 z-10 -mx-3 px-1 flex bg-mt-bg border-b border-mt-border text-[12px]" role="tablist" aria-label="Panels">
              {DOCK_TABS.map((d) => {
                const on = d.id === 'props' ? CANVAS_TOOLS.includes(tool) : tool === d.id;
                return (
                  <button key={d.id} role="tab" aria-selected={on}
                    onClick={() => setTool(d.id === 'props' ? lastCanvasTool.current : d.id)}
                    className={cx('h-8 px-2.5 border-b-2 -mb-px', on ? 'border-[#2680EB] text-mt-ink bg-mt-surface' : 'border-transparent text-mt-muted hover:text-mt-ink')}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          )}
          {panel}
          {pro && layers && showLayers && (
            <LayersPanel
              layers={layers}
              active={activeIdx}
              onSelect={(i) => layerOps.select(i)}
              onToggle={(i) => layerOps.patch(i, { visible: !layers[i].visible }, layers[i].visible ? 'Hide layer' : 'Show layer')}
              onRename={(i, name) => layerOps.patch(i, { name }, 'Rename layer')}
              onOpacity={(i, v) => layerOps.patch(i, { opacity: v }, 'Layer opacity')}
              onBlend={(i, b) => layerOps.patch(i, { blend: b }, 'Blend mode')}
              onAdd={layerOps.add}
              onPlace={() => placeRef.current?.click()}
              onDuplicate={layerOps.duplicate}
              onDelete={layerOps.remove}
              onUp={() => layerOps.move(1)}
              onDown={() => layerOps.move(-1)}
              onMerge={layerOps.mergeDown}
              onFlatten={layerOps.flatten}
            />
          )}
          {pro && showHistory && <HistoryPanel labels={history.list.map((h) => h.label)} index={history.index} onJump={(i) => setHistory((h) => ({ ...h, index: i }))} />}
        </aside>
      </div>

      {bgOpen && target && (
        <BgRemoveDialog
          img={{ getElement: () => target, _originalElement: target }}
          maxSize={Math.max(target.width, target.height)}
          onClose={() => { setBgOpen(false); setBgMode('remove'); }}
          onApply={async (dataUrl) => {
            const c = await loadSource(dataUrl);
            if (bgMode === 'subject') {
              setSel({ mask: maskFromAlpha(c, target.width, target.height), shape: null });
              setTool('select');
            } else push({ base: c, label: 'Remove background' });
            setBgMode('remove');
          }}
        />
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
      <input ref={placeRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) placeFile(f); e.target.value = ''; }} />
    </div>
  );
});

function HueRange({ value, onChange, onCommit }: { value: number; onChange: (v: number) => void; onCommit: () => void }) {
  return (
    <span className="relative block h-5" title="Hue">
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }} />
      <input type="range" min={0} max={360} value={value} data-live aria-label="Hue" onChange={(e) => onChange(Number(e.target.value))} onPointerUp={onCommit} onKeyUp={onCommit} className="mt-range absolute inset-0 w-full bg-transparent appearance-none cursor-pointer" />
    </span>
  );
}

function HslMixer({ values, onChange, onCommit }: { values: number[]; onChange: (i: number, v: number) => void; onCommit: () => void }) {
  const [part, setPart] = useState(0); // 0 hue, 1 saturation, 2 luminance
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {['Hue', 'Saturation', 'Luminance'].map((l, i) => (
          <button key={l} className={chip(part === i)} onClick={() => setPart(i)}>{l}</button>
        ))}
      </div>
      {HSL_RANGES.map((r, k) => (
        <div key={r.id} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: r.swatch }} />
          <div className="flex-1">
            <Range def={{ key: 'hsl', label: r.label, min: -100, max: 100 }} value={values[k * 3 + part]} onChange={(v) => onChange(k * 3 + part, v)} onCommit={onCommit} />
          </div>
        </div>
      ))}
    </div>
  );
}

const CURVE_CH = [
  { id: 'all', label: 'RGB', color: 'currentColor' },
  { id: 'r', label: 'Red', color: '#ef4444' },
  { id: 'g', label: 'Green', color: '#22c55e' },
  { id: 'b', label: 'Blue', color: '#3b82f6' },
] as const;

function CurveEditor({ curves, onChange, onCommit }: { curves: Adjust['curve']; onChange: (c: Adjust['curve']) => void; onCommit: () => void }) {
  const [ch, setCh] = useState<'all' | 'r' | 'g' | 'b'>('all');
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const pts = curves[ch];
  const lut = useMemo(() => curveLut(pts), [pts]);
  const path = useMemo(() => {
    let d = '';
    for (let x = 0; x < 256; x += 3) d += `${x ? 'L' : 'M'}${x},${255 - lut[x]}`;
    return d + `L255,${255 - lut[255]}`;
  }, [lut]);
  const toPt = (e: React.PointerEvent): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [Math.round(Math.min(255, Math.max(0, ((e.clientX - r.left) / r.width) * 255))), Math.round(Math.min(255, Math.max(0, 255 - ((e.clientY - r.top) / r.height) * 255)))];
  };
  const set = (next: CurvePts) => onChange({ ...curves, [ch]: next });
  const color = CURVE_CH.find((c) => c.id === ch)!.color;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {CURVE_CH.map((c) => (
          <button key={c.id} className={chip(ch === c.id)} onClick={() => setCh(c.id)}>{c.label}</button>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox="-4 -4 263 263"
        data-live
        className="w-full aspect-square rounded-lg bg-mt-surface2 touch-none text-mt-ink cursor-crosshair"
        onPointerDown={(e) => {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          const [x, y] = toPt(e);
          let i = pts.findIndex((p) => Math.abs(p[0] - x) < 10 && Math.abs(p[1] - y) < 14);
          if (i < 0) {
            const next = [...pts, [x, y] as [number, number]].sort((a, b) => a[0] - b[0]);
            i = next.findIndex((p) => p[0] === x && p[1] === y);
            set(next);
          }
          drag.current = i;
        }}
        onPointerMove={(e) => {
          if (drag.current === null) return;
          const [x, y] = toPt(e);
          const i = drag.current;
          const next = pts.map((p) => [...p] as [number, number]);
          const lo = i > 0 ? next[i - 1][0] + 1 : 0, hi = i < next.length - 1 ? next[i + 1][0] - 1 : 255;
          next[i] = [i === 0 ? Math.min(x, hi) : i === next.length - 1 ? Math.max(x, lo) : Math.min(hi, Math.max(lo, x)), y];
          set(next);
        }}
        onPointerUp={() => { drag.current = null; onCommit(); }}
        onDoubleClick={(e) => {
          const [x, y] = toPt(e as any);
          const i = pts.findIndex((p) => Math.abs(p[0] - x) < 10 && Math.abs(p[1] - y) < 14);
          if (i > 0 && i < pts.length - 1) { set(pts.filter((_, j) => j !== i)); onCommit(); }
        }}
      >
        {[64, 128, 192].map((g) => (
          <g key={g} stroke="currentColor" strokeOpacity={0.12}>
            <line x1={g} y1={0} x2={g} y2={255} />
            <line x1={0} y1={g} x2={255} y2={g} />
          </g>
        ))}
        <line x1={0} y1={255} x2={255} y2={0} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="4 4" />
        <path d={path} fill="none" stroke={color} strokeWidth={2.2} />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={255 - p[1]} r={5} fill="white" stroke={color === 'currentColor' ? '#111' : color} strokeWidth={2} />
        ))}
      </svg>
      <p className="text-[11px] text-mt-faint">Tap to add a point, drag to shape, double-tap a point to remove it.</p>
    </div>
  );
}

function CropOverlay({ box, base }: { box: CropBox; base: HTMLCanvasElement }) {
  const L = (box.x / base.width) * 100, T = (box.y / base.height) * 100;
  const W = (box.w / base.width) * 100, H = (box.h / base.height) * 100;
  const handles = ['tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l'];
  const pos: Record<string, string> = {
    tl: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize', t: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    tr: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize', r: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    br: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize', b: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
    bl: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize', l: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  };
  return (
    <div className="absolute inset-0">
      <div
        data-handle="move"
        className="absolute cursor-move"
        style={{ left: `${L}%`, top: `${T}%`, width: `${W}%`, height: `${H}%`, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', outline: '1.5px solid #fff' }}
      >
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => <span key={i} className="border border-white/25" />)}
        </div>
        {handles.map((h) => (
          <span key={h} data-handle={h} className={cx('absolute w-6 h-6 flex items-center justify-center', pos[h])}>
            <span data-handle={h} className={cx('bg-white shadow rounded-sm', h.length === 2 ? 'w-3.5 h-3.5' : h === 't' || h === 'b' ? 'w-6 h-2' : 'w-2 h-6')} />
          </span>
        ))}
      </div>
    </div>
  );
}

function LookTile({ look, preview, active, onPick }: { look: (typeof LOOKS)[number]; preview: { canvas: HTMLCanvasElement } | null; active: boolean; onPick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!preview || !ref.current) return;
    const src = preview.canvas;
    const k = 180 / Math.max(src.width, src.height);
    const small = resample(src, src.width * k, src.height * k);
    const data = small.getContext('2d')!.getImageData(0, 0, small.width, small.height);
    const out = applyAdjust(data, { ...NO_ADJUST, ...look.adjust });
    const c = ref.current;
    c.width = out.width;
    c.height = out.height;
    c.getContext('2d')!.putImageData(out, 0, 0);
  }, [preview, look]);
  return (
    <button onClick={onPick} className={cx('rounded-xl overflow-hidden border text-left transition-colors', active ? 'mt-spectrum-border border-transparent' : 'border-mt-border hover:border-mt-ink/30')}>
      <span className="block aspect-[4/3] bg-mt-surface2 overflow-hidden">
        <canvas ref={ref} className="w-full h-full object-cover" />
      </span>
      <span className="block px-2 py-1.5 text-[12px] font-medium text-mt-ink">{look.name}</span>
    </button>
  );
}

export default PhotoStudio;
