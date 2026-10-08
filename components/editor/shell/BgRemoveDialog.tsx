'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X, Brush, Eraser, MousePointer2 } from 'lucide-react';
import { detectSubject, refinedMaskCanvas, composeCutout, DEFAULT_REFINE, RefineOptions, SubjectMask } from '@/lib/editor/bgRemove';
import { Slider, Segmented, cx } from './ui';

const WORK = 1024;

export function BgRemoveDialog({ img, onApply, onClose }: { img: any; onApply: (dataUrl: string) => Promise<void> | void; onClose: () => void }) {
  const [status, setStatus] = useState<string | null>('Getting ready…');
  const [error, setError] = useState<string | null>(null);
  const [mask, setMask] = useState<SubjectMask | null>(null);
  const [opt, setOpt] = useState<RefineOptions>(DEFAULT_REFINE);
  const [mode, setMode] = useState<'view' | 'restore' | 'erase'>('view');
  const [brush, setBrush] = useState(40);
  const [applying, setApplying] = useState(false);
  const [version, setVersion] = useState(0);
  const srcRef = useRef<HTMLCanvasElement | null>(null);
  const restoreRef = useRef<HTMLCanvasElement | null>(null);
  const eraseRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Prepare the working copy and run the model once.
  useEffect(() => {
    const el: any = img?._originalElement || img?.getElement?.();
    if (!el) {
      setError('This picture could not be read.');
      return;
    }
    const w0 = el.naturalWidth || el.width;
    const h0 = el.naturalHeight || el.height;
    const k = Math.min(1, WORK / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * k));
    c.height = Math.max(1, Math.round(h0 * k));
    c.getContext('2d')!.drawImage(el, 0, 0, c.width, c.height);
    srcRef.current = c;
    const mk = () => {
      const p = document.createElement('canvas');
      p.width = c.width;
      p.height = c.height;
      return p;
    };
    restoreRef.current = mk();
    eraseRef.current = mk();
    let alive = true;
    detectSubject(c, (s) => alive && setStatus(s))
      .then((m) => {
        if (!alive) return;
        setMask(m);
        setStatus(null);
      })
      .catch((e) => {
        console.error('Background removal failed:', e);
        if (alive) setError("Background removal couldn't be completed. Check your connection and try again, or try another image.");
      });
    return () => {
      alive = false;
    };
  }, [img]);

  // Redraw the preview whenever settings or painting change.
  useEffect(() => {
    if (!mask || !srcRef.current || !viewRef.current) return;
    maskCanvasRef.current = refinedMaskCanvas(mask, opt);
    const out = composeCutout(srcRef.current, maskCanvasRef.current, { restore: restoreRef.current, erase: eraseRef.current }, WORK);
    const v = viewRef.current;
    v.width = out.width;
    v.height = out.height;
    const ctx = v.getContext('2d')!;
    ctx.clearRect(0, 0, v.width, v.height);
    if (mode !== 'view') {
      // Faint original underneath while painting, so erased parts are visible.
      ctx.globalAlpha = 0.25;
      ctx.drawImage(srcRef.current, 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(out, 0, 0);
  }, [mask, opt, version, mode]);

  const paint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode === 'view') return;
    const v = viewRef.current!;
    const target = mode === 'restore' ? restoreRef.current! : eraseRef.current!;
    const other = mode === 'restore' ? eraseRef.current! : restoreRef.current!;
    v.setPointerCapture(e.pointerId);
    const r = v.getBoundingClientRect();
    const scale = v.width / r.width;
    let last: { x: number; y: number } | null = null;
    const draw = (ev: { clientX: number; clientY: number; pressure?: number }) => {
      const x = (ev.clientX - r.left) * scale;
      const y = (ev.clientY - r.top) * scale;
      const size = brush * scale * (ev.pressure && ev.pressure > 0 && ev.pressure !== 0.5 ? 0.5 + ev.pressure : 1);
      for (const [cv, op] of [
        [target, 'source-over'],
        [other, 'destination-out'],
      ] as const) {
        const ctx = cv.getContext('2d')!;
        ctx.globalCompositeOperation = op;
        ctx.strokeStyle = '#fff';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(last ? last.x : x, last ? last.y : y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      last = { x, y };
      setVersion((n) => n + 1);
    };
    draw(e);
    const move = (ev: PointerEvent) => draw(ev);
    const up = () => {
      v.removeEventListener('pointermove', move);
      v.removeEventListener('pointerup', up);
    };
    v.addEventListener('pointermove', move);
    v.addEventListener('pointerup', up);
  };

  const apply = async () => {
    if (!mask || !maskCanvasRef.current) return;
    setApplying(true);
    try {
      const el: any = img._originalElement || img.getElement();
      const out = composeCutout(el, maskCanvasRef.current, { restore: restoreRef.current, erase: eraseRef.current }, 4096);
      await onApply(out.toDataURL('image/png'));
      onClose();
    } catch (e) {
      console.error(e);
      setError("The result couldn't be applied. Try again.");
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Remove background">
      <div className="w-full max-w-4xl max-h-[94vh] bg-mt-surface text-mt-ink rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 h-14 border-b border-mt-border">
          <h2 className="font-semibold">Remove background</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-mt-surface2">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 grid md:grid-cols-[1fr_280px]">
          <div className="relative min-h-[260px] flex items-center justify-center p-4 bg-[repeating-conic-gradient(#eef1f5_0_25%,#ffffff_0_50%)] bg-[length:20px_20px]">
            {(status || error) && !mask && (
              <div className="text-center px-6">
                {error ? (
                  <p className="text-sm text-red-600 max-w-sm">{error}</p>
                ) : (
                  <p className="text-sm text-mt-ink inline-flex items-center gap-2 bg-white/90 rounded-full px-4 py-2 shadow">
                    <Loader2 size={16} className="animate-spin" /> {status}
                  </p>
                )}
              </div>
            )}
            <canvas
              ref={viewRef}
              onPointerDown={paint}
              className={cx('max-w-full max-h-[64vh] touch-none', !mask && 'hidden', mode !== 'view' && 'cursor-crosshair')}
            />
          </div>
          <div className="border-t md:border-t-0 md:border-l border-mt-border p-4 overflow-y-auto flex flex-col gap-4">
            <p className="text-xs text-mt-muted">Runs on your device — your photo isn’t uploaded anywhere for this.</p>
            <Slider label="Cut-off" value={Math.round(opt.cutoff * 100)} min={5} max={95} onChange={(v) => setOpt({ ...opt, cutoff: v / 100 })} suffix="%" disabled={!mask} />
            <Slider label="Edge softness" value={Math.round(opt.softness * 100)} min={0} max={100} onChange={(v) => setOpt({ ...opt, softness: v / 100 })} suffix="%" disabled={!mask} />
            <Slider label="Feather" value={opt.feather} min={0} max={8} step={0.5} onChange={(v) => setOpt({ ...opt, feather: v })} disabled={!mask} />
            <div>
              <p className="text-xs text-mt-muted mb-1.5">Touch up</p>
              <Segmented
                size="sm"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'view', label: <MousePointer2 size={14} />, hint: 'Just look' },
                  { value: 'restore', label: <span className="inline-flex items-center gap-1"><Brush size={13} />Restore</span>, hint: 'Paint back parts that were removed' },
                  { value: 'erase', label: <span className="inline-flex items-center gap-1"><Eraser size={13} />Erase</span>, hint: 'Paint away parts that should be removed' },
                ]}
              />
              {mode !== 'view' && <div className="mt-3"><Slider label="Brush size" value={brush} min={4} max={160} onChange={setBrush} suffix=" px" /></div>}
            </div>
            <div className="mt-auto flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-mt-border text-sm font-medium">
                Cancel
              </button>
              <button type="button" onClick={apply} disabled={!mask || applying} className="flex-1 h-11 rounded-xl bg-mt-primary text-mt-onprimary text-sm font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2">
                {applying && <Loader2 size={15} className="animate-spin" />} Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
