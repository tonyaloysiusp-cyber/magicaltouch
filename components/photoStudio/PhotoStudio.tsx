'use client';

// Photo Studio: a focused photo editor with only tools that work well.
//   Adjust · Looks · Crop & rotate · Remove background · Heal · Resize · Export
// Adjustments stay live (non-destructive) on top of the picture; crop,
// heal, background removal and resize change the pixels, each step undoable.
// Used full-screen on /photo-studio and inside the Design editor's
// "Photo Editing" workspace, where "Apply to design" puts the result back
// into the SAME picture on the page.

import { forwardRef, ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  SlidersHorizontal, Sparkles, Crop as CropIcon, Scissors, Brush, Maximize2, Download, Undo2, Redo2, Plus, Minus,
  Maximize, RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2, Loader2, Check, X, Eye, Printer, Lock, Unlock,
} from 'lucide-react';
import { Adjust, NO_ADJUST, LIGHT_SLIDERS, COLOR_SLIDERS, DETAIL_SLIDERS, LOOKS, SliderDef, applyAdjust, renderAdjusted, isNeutral } from '@/lib/photo/adjust';
import { CropBox, PhysUnit, cropTo, flip, fmtNum, fromPx, inscribedRect, makeCanvas, resample, rotate90, spotHeal, toPx, fillBackground, hasTransparency } from '@/lib/photo/ops';
import { ColourMode, FORMAT_INFO, PhotoFormat, downloadBlob, exportPhoto, extFor } from '@/lib/photo/exportPhoto';
import { loadProofTable, proofRgbaInPlace, PRESS_PROFILE_NAME } from '@/lib/color/cmyk';
import { BgRemoveDialog } from '@/components/editor/shell/BgRemoveDialog';

type Tool = 'adjust' | 'looks' | 'crop' | 'bg' | 'heal' | 'resize' | 'export';
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

const TOOLS: { id: Tool; label: string; icon: any; standaloneOnly?: boolean }[] = [
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'looks', label: 'Looks', icon: Sparkles },
  { id: 'crop', label: 'Crop', icon: CropIcon },
  { id: 'bg', label: 'Background', icon: Scissors },
  { id: 'heal', label: 'Heal', icon: Brush },
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
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [proof, setProof] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = fit
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 });
  const stageRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
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
      let img: ImageData;
      if (comparing) img = src.getContext('2d')!.getImageData(0, 0, src.width, src.height);
      else img = isNeutral(adjust) ? new ImageData(new Uint8ClampedArray(preview.data.data), preview.data.width, preview.data.height) : applyAdjust(preview.data, adjust, preview.owner);
      if (proof && proofTable.current) proofRgbaInPlace(img.data, proofTable.current);
      d.width = img.width;
      d.height = img.height;
      const ctx = d.getContext('2d')!;
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
  }, [preview, adjust, comparing, proof, tool, cropAngle, tick]);

  // ---------------- actions
  const commitAdjust = (a: Adjust = adjust, label = 'Adjust') => {
    if (!snap) return;
    if (JSON.stringify(a) === JSON.stringify(snap.adjust)) return;
    push({ adjust: a, label });
  };
  const setOne = (k: keyof Adjust, v: number) => setAdjust((a) => ({ ...a, [k]: v }));

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
  const [healSize, setHealSize] = useState(40); // screen px
  const [healPts, setHealPts] = useState<{ x: number; y: number }[]>([]);
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
    if (tool === 'heal' && base) {
      gesture.current = { kind: 'heal' };
      setHealPts([toBase(e.clientX, e.clientY)]);
      return;
    }
    gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, pan: { ...pan } };
  };
  const onStageMove = (e: React.PointerEvent) => {
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
  const tools = TOOLS.filter((t) => !(embedded && t.standaloneOnly));

  const panel = (() => {
    if (!base) return null;
    switch (tool) {
      case 'adjust':
        return (
          <>
            {[{ t: 'Light', s: LIGHT_SLIDERS }, { t: 'Colour', s: COLOR_SLIDERS }, { t: 'Detail & effects', s: DETAIL_SLIDERS }].map(({ t, s }) => (
              <Section key={t} title={t} action={<button className="text-[11px] text-mt-faint hover:text-mt-ink" onClick={() => { const a = { ...adjust }; s.forEach((d) => ((a as any)[d.key] = 0)); setAdjust(a); commitAdjust(a, `Reset ${t}`); }}>Reset</button>}>
                {s.map((d) => (
                  <Range key={d.key} def={d} value={adjust[d.key] as number} onChange={(v) => setOne(d.key, v)} onCommit={() => setTimeout(() => setAdjust((a) => { commitAdjust(a); return a; }), 0)} />
                ))}
              </Section>
            ))}
            <Section title="Black & white">
              <div className="flex gap-2">
                <button className={chip(!adjust.mono)} onClick={() => { const a = { ...adjust, mono: 0 }; setAdjust(a); commitAdjust(a); }}>Colour</button>
                <button className={chip(!!adjust.mono)} onClick={() => { const a = { ...adjust, mono: 1 }; setAdjust(a); commitAdjust(a, 'Black & white'); }}>Black & white</button>
              </div>
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
      case 'heal':
        return (
          <Section title="Spot heal">
            <p className="text-[12px] text-mt-muted">Paint over a spot, blemish, dust or a small object. It’s replaced with matching texture from nearby.</p>
            <Range def={{ key: 'exposure', label: 'Brush size', min: 8, max: 200 }} value={healSize} onChange={setHealSize} onCommit={() => {}} />
            <p className="text-[12px] text-mt-faint">Tip: zoom in for small details. Undo with Ctrl/⌘ Z.</p>
          </Section>
        );
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

  const healCursor = tool === 'heal';
  return (
    <div className="h-full w-full flex flex-col bg-mt-bg text-mt-ink min-h-0">
      {/* top bar */}
      <div className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-mt-border bg-mt-surface">
        <div className="min-w-0 flex items-center gap-2">{headerLeft}</div>
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
                {t.label}
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
              {tool === 'crop' && box && base && (
                <CropOverlay box={box} base={base} />
              )}
              {tool === 'heal' && healPts.length > 0 && base && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${base.width} ${base.height}`} preserveAspectRatio="none">
                  <polyline points={healPts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(242,112,143,0.55)" strokeWidth={healSize / basePxToScreen} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
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
        <aside className="order-2 lg:order-3 shrink-0 lg:w-[340px] max-h-[42vh] lg:max-h-none overflow-y-auto border-t lg:border-t-0 lg:border-l border-mt-border bg-mt-surface px-4">
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
