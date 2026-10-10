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

import { forwardRef, ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  SlidersHorizontal, Sparkles, Crop as CropIcon, Scissors, Brush, Maximize2, Download, Undo2, Redo2, Plus, Minus,
  Maximize, RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2, Loader2, Check, X, Eye, Printer, Lock, Unlock, Palette, Wand2,
} from 'lucide-react';
import { Adjust, NO_ADJUST, LIGHT_SLIDERS, COLOR_SLIDERS, DETAIL_SLIDERS, LOOKS, SliderDef, applyAdjust, renderAdjusted, isNeutral, autoEnhance, HSL_RANGES, CurvePts, curveLut } from '@/lib/photo/adjust';
import { BrushKind, createStroke, replayStroke } from '@/lib/photo/brushes';
import { CropBox, PhysUnit, cropTo, flip, fmtNum, fromPx, inscribedRect, makeCanvas, resample, rotate90, spotHeal, toPx, fillBackground, hasTransparency } from '@/lib/photo/ops';
import { ColourMode, FORMAT_INFO, PhotoFormat, downloadBlob, exportPhoto, extFor } from '@/lib/photo/exportPhoto';
import { loadProofTable, proofRgbaInPlace, PRESS_PROFILE_NAME } from '@/lib/color/cmyk';
import { BgRemoveDialog } from '@/components/editor/shell/BgRemoveDialog';

type Tool = 'adjust' | 'color' | 'looks' | 'crop' | 'bg' | 'retouch' | 'resize' | 'export';
type Mode = 'simple' | 'pro';
type RetouchKind = 'heal' | BrushKind;
const RETOUCH: { id: RetouchKind; label: string; hint: string; pro?: boolean }[] = [
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
interface Snapshot { base: HTMLCanvasElement; adjust: Adjust; dpi: number; label: string }

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
];

function loadSource(src: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = makeCanvas(img.naturalWidth, img.naturalHeight);
      c.getContext('2d')!.drawImage(img, 0, 0);
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
  const base = snap?.base || null;
  const [adjust, setAdjust] = useState<Adjust>(NO_ADJUST);
  const [dpi, setDpi] = useState(props.dpi || 300);
  const [tool, setTool] = useState<Tool>('adjust');
  const [mode, setModeState] = useState<Mode>('simple');
  useEffect(() => {
    try {
      if (localStorage.getItem('mt:photoMode') === 'pro') setModeState('pro');
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
  const push = useCallback((s: Partial<Snapshot> & { label: string }) => {
    setHistory((h) => {
      const cur = h.list[h.index];
      const next: Snapshot = { base: s.base || cur.base, adjust: s.adjust || cur.adjust, dpi: s.dpi ?? cur.dpi, label: s.label };
      // Keep memory in check for big photos.
      const px = next.base.width * next.base.height;
      const cap = Math.max(6, Math.min(MAX_HISTORY, Math.floor(400_000_000 / Math.max(1, px * 4))));
      const list = [...h.list.slice(0, h.index + 1), next].slice(-cap);
      return { list, index: list.length - 1 };
    });
  }, []);
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
        setHistory({ list: [{ base: c, adjust: NO_ADJUST, dpi: props.dpi || 300, label: 'Open' }], index: 0 });
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
      if (ov) ov.style.visibility = 'hidden';
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

  const run = async (label: string, fn: () => HTMLCanvasElement | Promise<HTMLCanvasElement>, extra: Partial<Snapshot> = {}) => {
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

  const applyCrop = () => {
    if (!base || !box) return;
    const outW = exactPx ? exactPx.w : Math.round(box.w);
    const outH = exactPx ? exactPx.h : Math.round(box.h);
    run('Crop', () => cropTo(base, box, (cropAngle * Math.PI) / 180, outW, outH), exactPx ? { dpi: exactPx.dpi } : {}).then(() => {
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
    if (tool === 'retouch' && base && retouch === 'heal') {
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
      run('Heal', () => spotHeal(base, pts, r));
    }
    if (g?.kind === 'brush' && base && preview && strokeRef.current) {
      const st = strokeRef.current;
      strokeRef.current = null;
      const kind = retouch as BrushKind;
      const label = RETOUCH.find((x) => x.id === kind)?.label || 'Retouch';
      if (preview.k === 1) {
        // The preview is the full picture: keep what was painted.
        const c = makeCanvas(st.work.width, st.work.height);
        c.getContext('2d')!.putImageData(st.work, 0, 0);
        push({ base: c, label });
      } else run(label, () => replayStroke(base, kind, brushOpts(st.radius), st.pts, 1 / preview.k));
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!preview) return;
    const f = Math.exp(-e.deltaY * 0.0015);
    setZoom((z) => Math.min(8, Math.max(0.5, z * f)));
  };

  // ---------------- background removal
  const [bgOpen, setBgOpen] = useState(false);
  const transparent = useMemo(() => (base ? hasTransparency(base) : false), [base]);

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
  const tools = TOOLS.filter((t) => !(embedded && t.standaloneOnly) && (pro || !t.proOnly));

  const panel = (() => {
    if (!base) return null;
    switch (tool) {
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
                <button className={btnGhost} onClick={() => run('Rotate left', () => rotate90(base, -1))}><RotateCcw size={15} /> Left</button>
                <button className={btnGhost} onClick={() => run('Rotate right', () => rotate90(base, 1))}><RotateCw size={15} /> Right</button>
                <button className={btnGhost} onClick={() => run('Flip', () => flip(base, 'h'))} aria-label="Flip horizontally"><FlipHorizontal2 size={15} /></button>
                <button className={btnGhost} onClick={() => run('Flip', () => flip(base, 'v'))} aria-label="Flip vertically"><FlipVertical2 size={15} /></button>
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
                  <button key={c} aria-label={`Fill ${c}`} onClick={() => run('Background colour', () => fillBackground(base, c))} className="w-9 h-9 rounded-full border border-mt-border shadow-sm" style={{ background: c }} />
                ))}
                <label className="w-9 h-9 rounded-full border border-dashed border-mt-border inline-flex items-center justify-center cursor-pointer text-[10px] text-mt-muted" title="Any colour">
                  +<input type="color" className="sr-only" onChange={(e) => run('Background colour', () => fillBackground(base, e.target.value))} />
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
              <Range def={{ key: 'exposure', label: 'Brush size', min: 8, max: 240 }} value={healSize} onChange={setHealSize} onCommit={() => {}} />
              {retouch !== 'heal' && (
                <Range def={{ key: 'exposure', label: 'Strength', min: 5, max: 100 }} value={brushStrength} onChange={setBrushStrength} onCommit={() => {}} />
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
                } else run('Resize', () => resample(base, wpx, hpx), { dpi: Math.round(d) });
              }}
            >
              <Maximize2 size={15} /> Apply size
            </button>
          </Section>
        );
      }
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
  })();

  const healCursor = tool === 'retouch';
  return (
    <div className="h-full w-full flex flex-col bg-mt-bg text-mt-ink min-h-0">
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

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* tool rail */}
        <nav className="order-3 lg:order-1 shrink-0 lg:w-[84px] border-t lg:border-t-0 lg:border-r border-mt-border bg-mt-surface flex lg:flex-col overflow-x-auto mt-scroll" aria-label="Tools">
          {tools.map((t) => {
            const I = t.icon;
            const on = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={cx('shrink-0 min-w-[74px] lg:min-w-0 h-16 lg:h-[72px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', on ? 'text-mt-ink' : 'text-mt-muted hover:text-mt-ink')}
                aria-pressed={on}
              >
                <span className={cx('w-10 h-8 rounded-xl inline-flex items-center justify-center', on ? 'bg-mt-primary text-mt-onprimary' : '')}><I size={17} /></span>
                {!pro && t.simpleLabel ? t.simpleLabel : t.label}
              </button>
            );
          })}
        </nav>

        {/* stage */}
        <div
          ref={stageRef}
          className={cx('order-1 lg:order-2 relative flex-1 min-h-[42vh] overflow-hidden touch-none select-none', 'bg-[repeating-conic-gradient(rgba(127,127,127,0.10)_0_25%,transparent_0_50%)] bg-[length:22px_22px]', healCursor ? 'cursor-crosshair' : tool === 'crop' ? 'cursor-default' : zoom > 1 ? 'cursor-grab' : '')}
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
              <canvas ref={displayRef} className="block w-full h-full shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]" />
              <canvas ref={draftRef} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" style={{ visibility: 'hidden' }} />
              {tool === 'crop' && box && base && (
                <CropOverlay box={box} base={base} />
              )}
              {tool === 'retouch' && healPts.length > 0 && base && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${base.width} ${base.height}`} preserveAspectRatio="none">
                  <polyline points={healPts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(242,112,143,0.55)" strokeWidth={healSize / basePxToScreen} strokeLinecap="round" strokeLinejoin="round" />
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

        {/* panel */}
        <aside
          onPointerDownCapture={(e) => { if ((e.target as HTMLElement).closest?.('[data-live]')) setDragging(true); }}
          className="order-2 lg:order-3 shrink-0 lg:w-[340px] max-h-[42vh] lg:max-h-none overflow-y-auto border-t lg:border-t-0 lg:border-l border-mt-border bg-mt-surface px-4">
          {panel}
        </aside>
      </div>

      {bgOpen && base && (
        <BgRemoveDialog
          img={{ getElement: () => base, _originalElement: base }}
          maxSize={Math.max(base.width, base.height)}
          onClose={() => setBgOpen(false)}
          onApply={async (dataUrl) => {
            const c = await loadSource(dataUrl);
            push({ base: c, label: 'Remove background' });
          }}
        />
      )}
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
