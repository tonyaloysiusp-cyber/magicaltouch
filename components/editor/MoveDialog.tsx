'use client';
// Move… — Illustrator's Move dialog. With an object selected, press Enter
// (or use Object → Transform → Move…): type a horizontal and vertical
// distance (or distance and angle), watch it move with Preview, then OK to
// move it or Copy to leave the original and place a copy at that offset —
// handy for step-and-repeat layouts and print set-ups.
// Values are in the document's display unit; the caller converts with pxPer.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { X } from 'lucide-react';

export type MoveUnit = 'px' | 'mm' | 'cm' | 'in' | 'pt';
const PX_PER: Record<MoveUnit, number> = { px: 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, pt: 96 / 72 };
const KEY = 'mt:move-last';
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const FIELD = 'h-9 w-full rounded-lg border border-mt-border bg-mt-surface px-2.5 pr-9 text-[13px] tabular-nums outline-none focus:border-mt-ink';

// Defined outside the dialog so the inputs keep focus while typing.
function Num({ label, value, on, refIn, suffix }: { label: string; value: number; on: (n: number) => void; refIn?: RefObject<HTMLInputElement>; suffix: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { if (parseFloat(text) !== value) setText(String(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="grid grid-cols-[88px_1fr] items-center gap-2 text-[12.5px]">
      <span className="text-mt-muted">{label}</span>
      <span className="relative">
        <input ref={refIn} type="number" step="any" value={text} onChange={(e) => { setText(e.target.value); const n = parseFloat(e.target.value); on(Number.isFinite(n) ? n : 0); }} className={FIELD} />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-mt-faint">{suffix}</span>
      </span>
    </label>
  );
}

export function MoveDialog({
  unit,
  scale = 1,
  title = 'Move',
  onPreview,
  onCancel,
  onOk,
  onCopy,
}: {
  unit: MoveUnit;
  /** extra px multiplier (e.g. a photo's own pixels per CSS px); 1 in the design editor */
  scale?: number;
  title?: string;
  onPreview: (dxPx: number, dyPx: number) => void;
  onCancel: () => void;
  onOk: (dxPx: number, dyPx: number) => void;
  onCopy: (dxPx: number, dyPx: number) => void;
}) {
  const last = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '') as { h: number; v: number }; } catch { return { h: 0, v: 0 }; } })();
  const [h, setH] = useState<number>(last.h || 0);
  const [v, setV] = useState<number>(last.v || 0);
  const [preview, setPreview] = useState(true);
  const first = useRef<HTMLInputElement>(null);
  const toPx = (n: number) => n * PX_PER[unit] * scale;
  const dist = Math.hypot(h, v);
  const angle = dist ? (Math.atan2(-v, h) * 180) / Math.PI : 0; // Illustrator: positive angle is up and to the right

  useEffect(() => { first.current?.select(); }, []);
  useEffect(() => { onPreview(preview ? toPx(h) : 0, preview ? toPx(v) : 0); }, [h, v, preview]); // eslint-disable-line react-hooks/exhaustive-deps

  const remember = () => { try { localStorage.setItem(KEY, JSON.stringify({ h, v })); } catch { /* */ } };
  const setPolar = (d: number, a: number) => { const rad = (a * Math.PI) / 180; setH(r3(d * Math.cos(rad))); setV(r3(-d * Math.sin(rad))); };
  const ok = () => { remember(); onOk(toPx(h), toPx(v)); };
  const copy = () => { remember(); onCopy(toPx(h), toPx(v)); };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-label={title}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') { onCancel(); } if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); ok(); } }}>
      <div className="w-full max-w-[340px] rounded-2xl border border-mt-border bg-mt-bg p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button type="button" onClick={onCancel} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-mt-surface2"><X size={16} /></button>
        </div>
        <p className="mt-1 text-[11.5px] text-mt-faint">Position</p>
        <div className="mt-2 space-y-2">
          <Num label="Horizontal" value={h} on={setH} refIn={first} suffix={unit} />
          <Num label="Vertical" value={v} on={setV} suffix={unit} />
          <Num label="Distance" value={r3(dist)} on={(d) => setPolar(d, angle)} suffix={unit} />
          <Num label="Angle" value={r3(angle)} on={(a) => setPolar(dist, a)} suffix="°" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} /> Preview</label>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={copy} className="h-9 rounded-lg border border-mt-border text-[13px] font-semibold hover:bg-mt-surface2">Copy</button>
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-mt-border text-[13px] font-semibold hover:bg-mt-surface2">Cancel</button>
          <button type="button" onClick={ok} className="h-9 rounded-lg bg-mt-ink text-[13px] font-semibold text-mt-bg">OK</button>
        </div>
        <p className="mt-3 text-[11px] text-mt-faint">Positive vertical moves down. Copy leaves the original and places a copy at this offset. To repeat, press Enter again and Copy — the values are remembered.</p>
      </div>
    </div>
  );
}
