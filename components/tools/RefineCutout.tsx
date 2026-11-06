'use client';

// Touch-up for one photo of the background remover — like a mask brush in
// a photo editor: paint back what was removed by mistake (Restore), paint
// away what should go (Erase), see the result, a red overlay of the removed
// area, or the original, zoom in for fine edges, undo, then save or download.
// Everything stays on the device.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Brush, Download, Eraser, Hand, Loader2, Minus, Plus, Redo2, RotateCcw, Undo2, X } from 'lucide-react';
import { refinedMaskCanvas, composeCutout, DEFAULT_REFINE, RefineOptions, SubjectMask } from '@/lib/editor/bgRemove';
import { useEscapeKey } from '@/hooks/useEscapeKey';

export interface CutoutEdits {
  restore: HTMLCanvasElement;
  erase: HTMLCanvasElement;
  opt: RefineOptions;
}

type Tool = 'restore' | 'erase' | 'move';
type View = 'result' | 'overlay' | 'before';

const WORK = 1600; // painting resolution (long side)
const CHECKER = 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';

const blank = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
const copyOf = (src: HTMLCanvasElement, w: number, h: number) => {
  const c = blank(w, h);
  c.getContext('2d')!.drawImage(src, 0, 0, w, h);
  return c;
};

export function RefineCutout({
  name,
  img,
  mask,
  edits,
  background,
  onSave,
  onClose,
}: {
  name: string;
  img: HTMLImageElement;
  mask: SubjectMask;
  edits?: CutoutEdits;
  background: { kind: 'none' | 'white' | 'color'; color: string };
  onSave: (e: CutoutEdits) => void;
  onClose: () => void;
}) {
  useEscapeKey(() => onClose());
  const k = Math.min(1, WORK / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.max(1, Math.round(img.naturalWidth * k));
  const H = Math.max(1, Math.round(img.naturalHeight * k));

  const src = useRef<HTMLCanvasElement | null>(null);
  const restore = useRef<HTMLCanvasElement>(edits ? copyOf(edits.restore, W, H) : blank(W, H));
  const erase = useRef<HTMLCanvasElement>(edits ? copyOf(edits.erase, W, H) : blank(W, H));
  const view = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [opt, setOpt] = useState<RefineOptions>(edits?.opt || DEFAULT_REFINE);
  const [tool, setTool] = useState<Tool>('restore');
  const [mode, setMode] = useState<View>('overlay');
  const [size, setSize] = useState(36);
  const [zoom, setZoom] = useState(1);
  const [rev, setRev] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const undo = useRef<[ImageData, ImageData][]>([]);
  const redo = useRef<[ImageData, ImageData][]>([]);
  const [, force] = useState(0);

  if (!src.current) src.current = copyOf(img as unknown as HTMLCanvasElement, W, H);

  // Draw: result, red overlay on removed parts, or the original.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    v.width = W;
    v.height = H;
    const ctx = v.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    if (mode === 'before') {
      ctx.drawImage(src.current!, 0, 0);
      return;
    }
    const m = refinedMaskCanvas(mask, opt);
    const cut = composeCutout(src.current!, m, { restore: restore.current, erase: erase.current }, WORK);
    if (mode === 'overlay') {
      ctx.drawImage(src.current!, 0, 0);
      // red where removed: fill red, cut out the kept subject
      const red = blank(W, H);
      const r = red.getContext('2d')!;
      r.fillStyle = 'rgba(239, 68, 68, 0.55)';
      r.fillRect(0, 0, W, H);
      r.globalCompositeOperation = 'destination-out';
      r.drawImage(cut, 0, 0, W, H);
      ctx.drawImage(red, 0, 0);
      return;
    }
    if (background.kind !== 'none') {
      ctx.fillStyle = background.kind === 'white' ? '#FFFFFF' : background.color;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.drawImage(cut, 0, 0, W, H);
  }, [W, H, mask, opt, mode, rev, background]);

  // Fit to the window when it opens.
  const fit = useCallback(() => {
    const b = box.current;
    if (!b) return;
    setZoom(Math.min(1, (b.clientWidth - 24) / W, (b.clientHeight - 24) / H));
  }, [W, H]);
  useEffect(() => {
    fit();
  }, [fit]);

  const snapshot = () => {
    undo.current.push([restore.current.getContext('2d')!.getImageData(0, 0, W, H), erase.current.getContext('2d')!.getImageData(0, 0, W, H)]);
    if (undo.current.length > 30) undo.current.shift();
    redo.current = [];
    force((n) => n + 1);
  };
  const step = (from: typeof undo, to: typeof redo) => {
    const s = from.current.pop();
    if (!s) return;
    to.current.push([restore.current.getContext('2d')!.getImageData(0, 0, W, H), erase.current.getContext('2d')!.getImageData(0, 0, W, H)]);
    restore.current.getContext('2d')!.putImageData(s[0], 0, 0);
    erase.current.getContext('2d')!.putImageData(s[1], 0, 0);
    setRev((n) => n + 1);
  };

  const toCanvas = (e: { clientX: number; clientY: number }) => {
    const r = view.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, sx: e.clientX - r.left, sy: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const v = view.current!;
    v.setPointerCapture(e.pointerId);
    if (tool === 'move' || e.button === 1) {
      const b = box.current!;
      const start = { x: e.clientX, y: e.clientY, l: b.scrollLeft, t: b.scrollTop };
      const mv = (ev: PointerEvent) => {
        b.scrollLeft = start.l - (ev.clientX - start.x);
        b.scrollTop = start.t - (ev.clientY - start.y);
      };
      const up = () => {
        v.removeEventListener('pointermove', mv);
        v.removeEventListener('pointerup', up);
      };
      v.addEventListener('pointermove', mv);
      v.addEventListener('pointerup', up);
      return;
    }
    snapshot();
    const target = tool === 'restore' ? restore.current : erase.current;
    const other = tool === 'restore' ? erase.current : restore.current;
    let last: { x: number; y: number } | null = null;
    const draw = (ev: { clientX: number; clientY: number; pressure?: number }) => {
      const p = toCanvas(ev);
      const pr = ev.pressure && ev.pressure > 0 && ev.pressure !== 0.5 ? 0.5 + ev.pressure : 1;
      const lw = (size / zoom) * pr;
      for (const [cv, op] of [
        [target, 'source-over'],
        [other, 'destination-out'],
      ] as const) {
        const ctx = cv.getContext('2d')!;
        ctx.globalCompositeOperation = op;
        ctx.strokeStyle = '#fff';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(last ? last.x : p.x, last ? last.y : p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      last = { x: p.x, y: p.y };
      setRev((n) => n + 1);
    };
    draw(e);
    const mv = (ev: PointerEvent) => draw(ev);
    const up = () => {
      v.removeEventListener('pointermove', mv);
      v.removeEventListener('pointerup', up);
    };
    v.addEventListener('pointermove', mv);
    v.addEventListener('pointerup', up);
  };

  const reset = () => {
    snapshot();
    restore.current.getContext('2d')!.clearRect(0, 0, W, H);
    erase.current.getContext('2d')!.clearRect(0, 0, W, H);
    setOpt(DEFAULT_REFINE);
    setRev((n) => n + 1);
  };

  const current = (): CutoutEdits => ({ restore: restore.current, erase: erase.current, opt });

  const download = async () => {
    setSaving(true);
    try {
      const m = refinedMaskCanvas(mask, opt);
      const cut = composeCutout(img, m, { restore: restore.current, erase: erase.current }, 4096);
      let url: string;
      if (background.kind === 'none') url = cut.toDataURL('image/png');
      else {
        const c = blank(cut.width, cut.height);
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = background.kind === 'white' ? '#FFFFFF' : background.color;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(cut, 0, 0);
        url = c.toDataURL('image/jpeg', 0.92);
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}-no-bg.${background.kind === 'none' ? 'png' : 'jpg'}`;
      a.click();
      onSave(current());
    } finally {
      setSaving(false);
    }
  };

  const toolBtn = (t: Tool, label: string, icon: React.ReactNode, color: string) => (
    <button
      type="button"
      onClick={() => setTool(t)}
      aria-pressed={tool === t}
      className={`h-10 px-3 rounded-xl text-[13px] font-semibold inline-flex items-center gap-1.5 border ${tool === t ? `${color} text-white border-transparent` : 'border-mt-border text-mt-ink'}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-stretch sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Touch up ${name}`}>
      <div className="w-full max-w-6xl h-full sm:h-[92vh] bg-mt-surface text-mt-ink sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* top bar */}
        <div className="flex items-center gap-2 px-3 sm:px-4 h-14 border-b border-mt-border">
          <h2 className="font-semibold truncate flex-1 min-w-0">Touch up · <span className="text-mt-muted font-normal">{name}</span></h2>
          <button type="button" onClick={() => step(undo, redo)} disabled={!undo.current.length} aria-label="Undo" className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-mt-surface2 disabled:opacity-30"><Undo2 size={17} /></button>
          <button type="button" onClick={() => step(redo, undo)} disabled={!redo.current.length} aria-label="Redo" className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-mt-surface2 disabled:opacity-30"><Redo2 size={17} /></button>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-mt-surface2"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* canvas */}
          <div ref={box} className="relative flex-1 min-h-0 overflow-auto" style={{ background: mode === 'result' && background.kind === 'none' ? CHECKER : '#2b2b2f' }}>
            <div className="min-w-full min-h-full grid place-items-center p-3">
              <div className="relative" style={{ width: W * zoom, height: H * zoom }}>
                <canvas
                  ref={view}
                  onPointerDown={down}
                  onPointerMove={(e) => {
                    const p = toCanvas(e);
                    setCursor({ x: p.sx, y: p.sy });
                  }}
                  onPointerLeave={() => setCursor(null)}
                  className="block touch-none shadow-lg"
                  style={{ width: W * zoom, height: H * zoom, cursor: tool === 'move' ? 'grab' : 'none' }}
                />
                {cursor && tool !== 'move' && (
                  <span
                    className="pointer-events-none absolute rounded-full border-2"
                    style={{ left: cursor.x - size / 2, top: cursor.y - size / 2, width: size, height: size, borderColor: tool === 'restore' ? '#22c55e' : '#ef4444', boxShadow: '0 0 0 1px rgba(0,0,0,.45)' }}
                  />
                )}
              </div>
            </div>
            {/* zoom */}
            <div className="sticky bottom-3 left-0 flex justify-center pointer-events-none">
              <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/70 text-white px-2 py-1 text-[12px]">
                <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.1, z / 1.25))} className="h-7 w-7 grid place-items-center"><Minus size={14} /></button>
                <button type="button" onClick={fit} className="px-2 h-7 tabular-nums">{Math.round(zoom * 100)}%</button>
                <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(8, z * 1.25))} className="h-7 w-7 grid place-items-center"><Plus size={14} /></button>
              </div>
            </div>
          </div>

          {/* tools */}
          <div className="md:w-[290px] shrink-0 border-t md:border-t-0 md:border-l border-mt-border p-3 sm:p-4 flex flex-col gap-4 overflow-y-auto">
            <div>
              <p className="text-[12px] font-semibold text-mt-muted mb-1.5">Brush</p>
              <div className="flex flex-wrap gap-1.5">
                {toolBtn('restore', 'Restore', <Brush size={15} />, 'bg-emerald-600')}
                {toolBtn('erase', 'Erase', <Eraser size={15} />, 'bg-rose-600')}
                {toolBtn('move', 'Move', <Hand size={15} />, 'bg-mt-ink')}
              </div>
              <p className="mt-1.5 text-[11.5px] text-mt-faint">Restore paints back what was removed by mistake. Erase removes what should go.</p>
              <label className="mt-2 flex items-center gap-2 text-[12.5px] text-mt-muted">Size
                <input type="range" min={4} max={200} value={size} onChange={(e) => setSize(Number(e.target.value))} className="flex-1 accent-[#3B82C4]" />
                <span className="w-9 text-right tabular-nums">{size}</span>
              </label>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-mt-muted mb-1.5">Show</p>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-mt-surface2 p-1 text-[12.5px]">
                {([['overlay', 'Red overlay'], ['result', 'Result'], ['before', 'Before']] as [View, string][]).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setMode(v)} className={`h-8 rounded-lg ${mode === v ? 'bg-mt-surface shadow font-semibold text-mt-ink' : 'text-mt-muted'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-semibold text-mt-muted">Edges</p>
              {([['Cut-off', 'cutoff', 0.05, 0.95, 0.05], ['Softness', 'softness', 0, 1, 0.05], ['Feather', 'feather', 0, 8, 0.5]] as [string, keyof RefineOptions, number, number, number][]).map(([l, key, mn, mx, st]) => (
                <label key={key} className="flex items-center gap-2 text-[12.5px] text-mt-muted">
                  <span className="w-16">{l}</span>
                  <input type="range" min={mn} max={mx} step={st} value={opt[key] as number} onChange={(e) => setOpt({ ...opt, [key]: Number(e.target.value) })} className="flex-1 accent-[#3B82C4]" />
                </label>
              ))}
            </div>
            <button type="button" onClick={reset} className="h-9 rounded-xl border border-mt-border text-[13px] inline-flex items-center justify-center gap-1.5 text-mt-muted"><RotateCcw size={14} /> Start again</button>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { onSave(current()); onClose(); }} className="h-11 rounded-xl border border-mt-border text-[14px] font-semibold">Save</button>
              <button type="button" onClick={download} disabled={saving} className="h-11 rounded-xl bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
