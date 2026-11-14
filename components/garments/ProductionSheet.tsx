'use client';

// Production sheet: the "Save fabric" nesting of the whole order on one
// roll, editable by hand. Drag a piece to move it (it stays where you put
// it), turn it 90°, lock it; Re-nest packs everything that is not locked
// again around the locked pieces. Overlaps and pieces off the roll are shown
// in red and the sheet is not ready to print until they are fixed.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, RotateCw, Undo2, Unlock, Wand2, X, Redo2, RefreshCcw } from 'lucide-react';
import { fabricLayout, layoutOf, boxPlaced, type KitDesign, type Player, type SheetLayout } from '@/lib/teamKit';
import { pieceTransform } from '@/lib/garments';

export interface ProductionSheetProps {
  kit: KitDesign;
  players: Player[];
  rollW: number;
  bleed: number;
  layout: SheetLayout | undefined;
  onChange: (l: SheetLayout | undefined) => void;
  onClose: () => void;
}

const hue = (i: number) => `hsl(${(i * 47) % 360} 55% 82%)`;

export function ProductionSheet({ kit, players, rollW, bleed, layout, onChange, onClose }: ProductionSheetProps) {
  const L = useMemo(() => fabricLayout(kit, players, { rollW, bleed, layout }), [kit, players, rollW, bleed, layout]);
  const [sel, setSel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const hist = useRef<{ past: (SheetLayout | undefined)[]; future: (SheetLayout | undefined)[] }>({ past: [], future: [] });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ key: string; dx: number; dy: number; start: SheetLayout; moved: boolean } | null>(null);
  const [live, setLive] = useState<SheetLayout | null>(null); // layout while dragging (not yet in history)
  const view = useMemo(() => (live ? fabricLayout(kit, players, { rollW, bleed, layout: live }) : L), [live, L, kit, players, rollW, bleed]);
  const bad = new Set([...view.overlaps.flat(), ...view.offRoll]);
  const problems = view.overlaps.length + view.offRoll.length;
  const selBox = view.boxes.find((b) => b.key === sel) || null;

  const commit = (next: SheetLayout | undefined) => { hist.current.past.push(layout); hist.current.future = []; onChange(next); };
  const undo = () => { if (!hist.current.past.length) return; hist.current.future.push(layout); onChange(hist.current.past.pop()); };
  const redo = () => { if (!hist.current.future.length) return; hist.current.past.push(layout); onChange(hist.current.future.pop()); };
  const current = () => layout ? { ...layoutOf(L.boxes), ...layout } : layoutOf(L.boxes);
  const edit = (key: string, o: Partial<SheetLayout[string]>) => { const cur = current(); cur[key] = { ...cur[key], ...o }; commit(cur); };
  const rotate = () => { if (!selBox) return; edit(selBox.key, { rot: !selBox.rot }); };
  const lock = (on: boolean) => { if (!selBox) return; edit(selBox.key, { locked: on }); };
  const lockAll = () => { const cur = current(); for (const k of Object.keys(cur)) cur[k] = { ...cur[k], locked: true }; commit(cur); };
  const unlockAll = () => { const cur = current(); for (const k of Object.keys(cur)) { const { locked, ...rest } = cur[k]; void locked; cur[k] = rest; } commit(cur); };
  const renest = () => { const cur = current(); const keep: SheetLayout = {}; for (const [k, v] of Object.entries(cur)) if (v.locked) keep[k] = v; commit(Object.keys(keep).length ? keep : undefined); };
  const reset = () => commit(undefined);

  const toMm = (e: { clientX: number; clientY: number }) => {
    const s = svg.current!; const pt = s.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = s.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse()); return { x: p.x, y: p.y };
  };
  const down = (e: React.PointerEvent, key: string) => {
    e.stopPropagation(); setSel(key);
    const b = view.boxes.find((x) => x.key === key)!;
    if (b.locked) return;
    const p = toMm(e);
    drag.current = { key, dx: p.x - b.x, dy: p.y - b.y, start: current(), moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const p = toMm(e);
    const next = { ...d.start, [d.key]: { ...d.start[d.key], x: Math.round(p.x - d.dx), y: Math.max(0, Math.round(p.y - d.dy)) } };
    d.moved = true; setLive(next);
  };
  const up = () => { const d = drag.current; drag.current = null; if (d && d.moved && live) commit(live); setLive(null); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null; if (t?.closest('input,textarea,select')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (e.key === 'Escape') { if (sel) setSel(null); else onClose(); return; }
      if (!selBox) return;
      if (e.key.toLowerCase() === 'r') { rotate(); return; }
      if (e.key.toLowerCase() === 'l') { lock(!selBox.locked); return; }
      if (e.key.startsWith('Arrow') && !selBox.locked) {
        e.preventDefault(); const s = e.shiftKey ? 10 : 1;
        edit(selBox.key, { x: selBox.x + (e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0), y: Math.max(0, selBox.y + (e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0)) });
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const btn = 'h-9 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-mt-surface2 disabled:opacity-40';
  const H = view.length;
  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-mt-bg" role="dialog" aria-label="Production sheet">
      <div className="flex flex-wrap items-center gap-2 border-b border-mt-border bg-mt-surface px-3 py-2">
        <p className="text-[14px] font-semibold">Production sheet</p>
        <span className="text-[12px] text-mt-muted">{rollW} mm roll · bleed {bleed} mm</span>
        <span className="mx-1 h-6 w-px bg-mt-border" />
        <button type="button" onClick={undo} disabled={!hist.current.past.length} className={btn} aria-label="Undo"><Undo2 size={14} /></button>
        <button type="button" onClick={redo} disabled={!hist.current.future.length} className={btn} aria-label="Redo"><Redo2 size={14} /></button>
        <button type="button" onClick={rotate} disabled={!selBox} className={btn}><RotateCw size={14} /> Turn 90°</button>
        <button type="button" onClick={() => lock(!selBox?.locked)} disabled={!selBox} className={btn}>{selBox?.locked ? <><Unlock size={14} /> Unlock</> : <><Lock size={14} /> Lock</>}</button>
        <button type="button" onClick={lockAll} className={btn}>Lock all</button>
        <button type="button" onClick={unlockAll} className={btn}>Unlock all</button>
        <button type="button" onClick={renest} className={btn}><Wand2 size={14} /> Re-nest</button>
        <button type="button" onClick={reset} disabled={!layout} className={btn}><RefreshCcw size={14} /> Automatic layout</button>
        <span className="inline-flex items-center rounded-full border border-mt-border text-[12px]"><button type="button" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} className="h-8 px-2.5" aria-label="Zoom out">−</button><span className="tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((z) => Math.min(6, z * 1.25))} className="h-8 px-2.5" aria-label="Zoom in">+</button></span>
        <span className="ml-auto" />
        <button type="button" onClick={onClose} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold">Done</button>
        <button type="button" onClick={onClose} aria-label="Close production sheet" className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-mt-border"><X size={15} /></button>
      </div>
      <div aria-label="Sheet status" className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-mt-border px-3 py-1.5 text-[12.5px] ${problems ? 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-100' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100'}`}>
        <b>{problems ? `Not ready — ${view.overlaps.length} overlap${view.overlaps.length === 1 ? '' : 's'}${view.offRoll.length ? `, ${view.offRoll.length} off the roll` : ''}` : 'Ready to print — no overlaps'}</b>
        <span>{view.boxes.length} pieces</span>
        <span>{(H / 1000).toFixed(2)} m of roll</span>
        <span>Fabric use {Math.round(view.utilisation * 100)}%</span>
        <span>{layout ? `${Object.values(layout).filter((v) => v.locked).length} locked · edited by hand` : 'Automatic layout'}</span>
        {selBox && <span className="text-mt-ink">Selected: {selBox.label} · {Math.round(selBox.x)}, {Math.round(selBox.y)} mm{selBox.rot ? ' · turned' : ''}{selBox.locked ? ' · locked' : ''}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4" onPointerDown={() => setSel(null)}>
        <svg ref={svg} viewBox={`-20 -20 ${rollW + 40} ${H + 40}`} style={{ width: `${Math.max(320, Math.min(1400, rollW * 0.55)) * zoom}px`, touchAction: 'none' }} className="mx-auto block select-none" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <rect x={0} y={0} width={rollW} height={H} fill="#fff" stroke="#94A3B8" strokeWidth={1.5} />
          {Array.from({ length: Math.floor(H / 1000) }, (_, i) => <g key={i}><line x1={0} x2={rollW} y1={(i + 1) * 1000} y2={(i + 1) * 1000} stroke="#CBD5E1" strokeDasharray="8 6" /><text x={rollW + 4} y={(i + 1) * 1000 + 4} fontSize={14} fill="#64748B">{i + 1} m</text></g>)}
          {view.boxes.map((b) => {
            const pl = boxPlaced(b, bleed);
            const isSel = b.key === sel, isBad = bad.has(b.key);
            return <g key={b.key} onPointerDown={(e) => down(e, b.key)} style={{ cursor: b.locked ? 'not-allowed' : 'move' }} role="button" aria-label={`Piece ${b.label}`} aria-pressed={isSel}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={isBad ? 'rgba(225,29,72,0.12)' : 'rgba(148,163,184,0.06)'} stroke={isBad ? '#E11D48' : isSel ? '#2563EB' : '#CBD5E1'} strokeWidth={isSel || isBad ? 3 : 1} strokeDasharray={b.locked ? '' : '6 4'} />
              <path d={b.piece.d} transform={pieceTransform(pl)} fill={hue(b.idx)} stroke="#334155" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
              <text x={b.x + 3} y={b.y + 13} fontSize={13} fill="#334155">{b.locked ? '🔒 ' : ''}{b.label}{b.rot ? ' · turned' : ''}</text>
            </g>;
          })}
        </svg>
        <p className="mx-auto mt-3 max-w-xl text-center text-[12px] text-mt-muted">Drag pieces to move them (they stay where you put them). Select a piece: R turns it, L locks it, arrows nudge 1 mm (Shift = 10 mm). Re-nest packs everything that is not locked again. Dashed box = movable, solid = locked.</p>
      </div>
    </div>
  );
}
